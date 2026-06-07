import { Worker, Job } from 'bullmq';
import { pgPool } from '../config/db';
import { User } from '../models';

const REDIS_CONNECTION_OPTS = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6380'),
};

export const startPayrollWorker = () => {
  try {
    const worker = new Worker(
      'payrollRunQueue',
      async (job: Job) => {
        const { month, year, triggeredBy } = job.data;
        console.log(`[Payroll Worker] Processing job ${job.id} for period ${month}/${year} triggered by ${triggeredBy}`);

        // Fetch active employees
        const employees = await User.find({ isActive: true }, 'employeeId');
        const total = employees.length;
        let processed = 0;

        const workingDays = 22; // standard working days

        for (const emp of employees) {
          const empId = emp.employeeId;
          try {
            // 1. Fetch active structure
            const structRes = await pgPool.query(
              'SELECT * FROM payroll_structures WHERE employee_id = $1 AND is_active = true LIMIT 1',
              [empId]
            );
            const struct = structRes.rows[0];

            if (!struct) {
              console.warn(`[Payroll Worker] No active structure for ${empId}. Skipping.`);
              continue;
            }

            // 2. Fetch attendance logs summary
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

            // Calculation math
            const monthlyCtc = parseFloat(struct.ctc_annual) / 12;
            const basic = parseFloat(struct.basic);
            const hra = parseFloat(struct.hra);
            const special = parseFloat(struct.special_allowance);
            
            const baseMonthlyGross = basic + hra + special;
            const lopDeduction = (baseMonthlyGross / workingDays) * lopDays;
            const grossSalary = Math.max(0, baseMonthlyGross - lopDeduction);

            const pfEmployee = parseFloat(struct.pf_employee);
            const professionalTax = parseFloat(struct.professional_tax);
            const tds = parseFloat(struct.tds);
            
            const totalDeductions = pfEmployee + professionalTax + tds;
            const netSalary = Math.max(0, grossSalary - totalDeductions);

            // Upsert run record in PostgreSQL
            await pgPool.query(`
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
            `, [
              empId, month, year, workingDays, presentDays, leavesTaken, lopDays, overtimeHours,
              grossSalary, totalDeductions, netSalary,
              `https://cloudinary.com/mock-payslip-${empId}-${month}-${year}.pdf`
            ]);

            processed++;
            // Update progress in job
            await job.updateProgress(Math.round((processed / total) * 100));
          } catch (empErr) {
            console.error(`[Payroll Worker] Failed to process employee ${empId}:`, empErr);
          }
        }

        console.log(`[Payroll Worker] Job ${job.id} completed. Processed ${processed}/${total} employee runs.`);
        return { processed, total };
      },
      {
        connection: REDIS_CONNECTION_OPTS
      }
    );

    worker.on('completed', (job) => {
      console.log(`[Payroll Worker] Job ${job.id} has completed successfully.`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Payroll Worker] Job ${job?.id} failed with error:`, err);
    });

    console.log('[Payroll Worker] BullMQ worker process started listening.');
  } catch (err) {
    console.error('[Payroll Worker] Worker startup failed:', err);
  }
};
