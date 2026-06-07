import { Response } from 'express';
import { pgPool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models';
import { Queue } from 'bullmq';
import { redisClient } from '../config/db';

const REDIS_CONNECTION_OPTS = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6380'),
};

// Initialize BullMQ Queue
let payrollQueue: Queue | null = null;
try {
  payrollQueue = new Queue('payrollRunQueue', {
    connection: REDIS_CONNECTION_OPTS
  });
  console.log('[Payroll Queue] BullMQ initialized successfully.');
} catch (err) {
  console.warn('[Payroll Queue] Failed to initialize BullMQ. Will fallback to synchronous runs.', err);
}

// ==========================================
// 1. GET SALARY STRUCTURE
// ==========================================
export const getStructure = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId } = req.params;

    // Check permissions
    if (req.user?.role === 'employee' && req.user.employeeId !== employeeId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const result = await pgPool.query(
      'SELECT * FROM payroll_structures WHERE employee_id = $1 AND is_active = true LIMIT 1',
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Salary structure not found.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Get structure error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 2. CREATE / UPDATE SALARY STRUCTURE
// ==========================================
export const updateStructure = async (req: AuthenticatedRequest, res: Response) => {
  const pgClient = await pgPool.connect();
  try {
    const { employeeId, ctcAnnual, effectiveFrom } = req.body;

    if (!employeeId || !ctcAnnual) {
      return res.status(400).json({ message: 'employeeId and ctcAnnual are required.' });
    }

    // Verify user exists
    const employee = await User.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee user does not exist in directory.' });
    }

    const ctc = parseFloat(ctcAnnual);
    const basic = ctc * 0.4;
    const hra = ctc * 0.2;
    const special = ctc - (basic + hra);
    const pf = basic * 0.12;
    const pt = 200;
    const tds = ctc * 0.05;

    await pgClient.query('BEGIN');

    // Inactivate existing structure
    await pgClient.query(
      'UPDATE payroll_structures SET is_active = false WHERE employee_id = $1 AND is_active = true',
      [employeeId]
    );

    // Insert new structure
    const insertRes = await pgClient.query(`
      INSERT INTO payroll_structures (
        employee_id, effective_from, ctc_annual, basic, hra, special_allowance, 
        pf_employee, pf_employer, professional_tax, tds, other_deductions, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, true, $11)
      RETURNING *
    `, [
      employeeId,
      effectiveFrom ? new Date(effectiveFrom) : new Date(),
      ctc,
      basic / 12,
      hra / 12,
      special / 12,
      pf / 12,
      pf / 12,
      pt,
      tds / 12,
      req.user?.employeeId || 'SYSTEM'
    ]);

    await pgClient.query('COMMIT');

    return res.status(200).json({
      message: 'Salary structure updated successfully.',
      structure: insertRes.rows[0],
    });
  } catch (err) {
    await pgClient.query('ROLLBACK');
    console.error('Update structure error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    pgClient.release();
  }
};

// ==========================================
// 3. RUN MONTHLY PAYROLL
// ==========================================
export const runPayroll = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required fields.' });
    }

    console.log(`[Payroll] Triggering payroll run for ${month}/${year}...`);

    // Always run payroll synchronously so the client gets the processed runs immediately
    console.log('[Payroll] Running payroll synchronously...');
    
    // Fetch all active employees in MongoDB
    const employees = await User.find({ isActive: true }, 'employeeId');
    const processedRuns = [];

    // Helper: Days in month calculation
    const workingDays = 22; // Hardcode standard corporate working days (excluding weekends)

    for (const emp of employees) {
      const empId = emp.employeeId;

      // 1. Fetch active structure
      const structRes = await pgPool.query(
        'SELECT * FROM payroll_structures WHERE employee_id = $1 AND is_active = true LIMIT 1',
        [empId]
      );
      
      const struct = structRes.rows[0];
      if (!struct) {
        console.warn(`[Payroll Fallback] Skipping ${empId}: No active salary structure found.`);
        continue;
      }

      // 2. Fetch attendance logs summary for this month
      const attendanceRes = await pgPool.query(`
        SELECT 
          COUNT(CASE WHEN status IN ('present', 'work_from_home', 'late') THEN 1 END) as present,
          COUNT(CASE WHEN status = 'on_leave' THEN 1 END) as leaves,
          COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
          SUM(COALESCE(overtime_hours, 0)) as overtime
        FROM attendance 
        WHERE employee_id = $1 
          AND EXTRACT(MONTH FROM date) = $2 
          AND EXTRACT(YEAR FROM date) = $3
      `, [empId, month, year]);

      const att = attendanceRes.rows[0];
      const presentDays = parseFloat(att.present || 0);
      const leavesTaken = parseFloat(att.leaves || 0);
      const lopDays = Math.max(0, workingDays - (presentDays + leavesTaken));
      const overtimeHours = parseFloat(att.overtime || 0);

      // Calculations
      const monthlyCtc = parseFloat(struct.ctc_annual) / 12;
      const basic = parseFloat(struct.basic);
      const hra = parseFloat(struct.hra);
      const special = parseFloat(struct.special_allowance);
      
      // Calculate Gross after LOP deduction
      const baseMonthlyGross = basic + hra + special;
      const lopDeduction = (baseMonthlyGross / workingDays) * lopDays;
      const grossSalary = Math.max(0, baseMonthlyGross - lopDeduction);

      const pfEmployee = parseFloat(struct.pf_employee);
      const professionalTax = parseFloat(struct.professional_tax);
      const tds = parseFloat(struct.tds);
      
      const totalDeductions = pfEmployee + professionalTax + tds;
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      // Insert/Upsert into payroll_runs in PostgreSQL
      const runRes = await pgPool.query(`
        INSERT INTO payroll_runs (
          employee_id, month, year, working_days, present_days, leaves_taken, lop_days, overtime_hours, 
          gross_salary, total_deductions, net_salary, payslip_url, status, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'processed', NOW())
        ON CONFLICT (employee_id, month, year) DO UPDATE SET
          working_days = EXCLUDED.working_days,
          present_days = EXCLUDED.present_days,
          leaves_taken = EXCLUDED.leaves_taken,
          lop_days = EXCLUDED.lop_days,
          overtime_hours = EXCLUDED.overtime_hours,
          gross_salary = EXCLUDED.gross_salary,
          total_deductions = EXCLUDED.total_deductions,
          net_salary = EXCLUDED.net_salary,
          processed_at = NOW()
        RETURNING *
      `, [
        empId, month, year, workingDays, presentDays, leavesTaken, lopDays, overtimeHours,
        grossSalary, totalDeductions, netSalary,
        `https://cloudinary.com/mock-payslip-${empId}-${month}-${year}.pdf`
      ]);

      processedRuns.push(runRes.rows[0]);
    }

    return res.status(200).json({
      message: 'Payroll processed successfully (synchronously).',
      processedCount: processedRuns.length,
      runs: processedRuns
    });
  } catch (err) {
    console.error('Run payroll error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 4. GET SIGNED PAYSLIP URL
// ==========================================
export const getPayslipUrl = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { month, year } = req.params;
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(401).json({ message: 'Unidentified user.' });
    }

    const runRes = await pgPool.query(
      'SELECT payslip_url, status FROM payroll_runs WHERE employee_id = $1 AND month = $2 AND year = $3 LIMIT 1',
      [employeeId, parseInt(month), parseInt(year)]
    );

    if (runRes.rows.length === 0) {
      return res.status(404).json({ message: 'Payslip not found for the specified month.' });
    }

    const run = runRes.rows[0];
    return res.status(200).json({
      month,
      year,
      status: run.status,
      payslipUrl: run.payslip_url || 'https://cloudinary.com/mock-signed-url.pdf'
    });
  } catch (err) {
    console.error('Get payslip error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 5. GET MONTHLY PAYROLL RUNS (Admin)
// ==========================================
export const getMonthlyRuns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { month, year } = req.params;
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required params.' });
    }

    const runsRes = await pgPool.query(
      'SELECT * FROM payroll_runs WHERE month = $1 AND year = $2',
      [parseInt(month), parseInt(year)]
    );

    return res.status(200).json(runsRes.rows);
  } catch (err) {
    console.error('Get monthly runs error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
