import { Response } from 'express';
import { pgPool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// ==========================================
// 1. GET LEAVE BALANCES
// ==========================================
export const getBalances = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const year = new Date().getFullYear();
    const result = await pgPool.query(
      'SELECT leave_type, total_days, used_days, pending_days, remaining_days FROM leave_balances WHERE employee_id = $1 AND year = $2',
      [employeeId, year]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Get leave balances error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 2. APPLY FOR LEAVE
// ==========================================
export const applyLeave = async (req: AuthenticatedRequest, res: Response) => {
  const pgClient = await pgPool.connect();
  try {
    const employeeId = req.user?.employeeId;
    const { leaveType, fromDate, toDate, reason } = req.body;

    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!leaveType || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: 'All fields are mandatory.' });
    }

    // Calculate days between
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    await pgClient.query('BEGIN');

    // Fetch remaining balance
    const year = start.getFullYear();
    const balanceRes = await pgClient.query(
      'SELECT remaining_days FROM leave_balances WHERE employee_id = $1 AND year = $2 AND leave_type = $3 LIMIT 1',
      [employeeId, year, leaveType]
    );

    if (balanceRes.rows.length === 0) {
      return res.status(400).json({ message: `No leave balance allocated for ${leaveType} in ${year}.` });
    }

    const remaining = parseFloat(balanceRes.rows[0].remaining_days);
    if (remaining < days) {
      return res.status(400).json({ message: `Insufficient leave balance. Requested: ${days}, Remaining: ${remaining}.` });
    }

    // Create request
    const requestRes = await pgClient.query(`
      INSERT INTO leave_requests (
        employee_id, leave_type, from_date, to_date, days, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [employeeId, leaveType, fromDate, toDate, days, reason]);

    // Update leave balances pending count
    await pgClient.query(`
      UPDATE leave_balances 
      SET pending_days = pending_days + $1 
      WHERE employee_id = $2 AND year = $3 AND leave_type = $4
    `, [days, employeeId, year, leaveType]);

    await pgClient.query('COMMIT');

    return res.status(201).json({
      message: 'Leave application submitted successfully.',
      request: requestRes.rows[0],
    });
  } catch (err: any) {
    await pgClient.query('ROLLBACK');
    console.error('Apply leave error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    pgClient.release();
  }
};

// ==========================================
// 3. GET TEAM PENDING LEAVE REQUESTS (For Managers)
// ==========================================
export const getPendingRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const managerId = req.user?.id;
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    let directReports = [];
    if (req.user.role === 'admin') {
      directReports = await require('../models').User.find({}, 'employeeId firstName lastName');
    } else {
      if (!managerId) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }
      directReports = await require('../models').User.find({ reportingManagerId: managerId }, 'employeeId firstName lastName');
    }
    
    const employeeIds = directReports.map((r: any) => r.employeeId);

    if (employeeIds.length === 0) {
      return res.status(200).json([]);
    }

    const result = await pgPool.query(`
      SELECT lr.id, lr.employee_id, lr.leave_type, lr.from_date, lr.to_date, lr.days, lr.reason, lr.status, lr.applied_at
      FROM leave_requests lr
      WHERE lr.employee_id = ANY($1) AND lr.status = 'pending'
      ORDER BY lr.applied_at ASC
    `, [employeeIds]);

    // Attach employee names to records
    const map = new Map(directReports.map((r: any) => [r.employeeId, `${r.firstName} ${r.lastName}`]));
    const records = result.rows.map((row) => ({
      ...row,
      employeeName: map.get(row.employee_id) || 'Unknown Employee'
    }));

    return res.status(200).json(records);
  } catch (err) {
    console.error('Fetch pending leaves error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 4. APPROVE / REJECT LEAVE REQUEST
// ==========================================
export const approveRejectLeave = async (req: AuthenticatedRequest, res: Response) => {
  const pgClient = await pgPool.connect();
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // approved | rejected

    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ message: 'Invalid status update.' });
    }

    await pgClient.query('BEGIN');

    // Fetch leave request
    const requestRes = await pgClient.query(
      'SELECT employee_id, leave_type, days, status, from_date FROM leave_requests WHERE id = $1 LIMIT 1',
      [id]
    );

    if (requestRes.rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    const request = requestRes.rows[0];
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Leave request has already been processed.' });
    }

    const year = new Date(request.from_date).getFullYear();

    if (status === 'approved') {
      // Deduct pending, Add used
      await pgClient.query(`
        UPDATE leave_balances 
        SET pending_days = pending_days - $1,
            used_days = used_days + $1
        WHERE employee_id = $2 AND year = $3 AND leave_type = $4
      `, [request.days, request.employee_id, year, request.leave_type]);

      // If approved, insert corresponding 'on_leave' attendance logs automatically! (Real-time sync!)
      // This is a premium production logic that keeps attendance & leaves synchronized!
      const start = new Date(request.from_date);
      for (let d = 0; d < Math.ceil(request.days); d++) {
        const leaveDate = new Date(start);
        leaveDate.setDate(start.getDate() + d);
        const dateStr = leaveDate.toISOString().split('T')[0];

        await pgClient.query(`
          INSERT INTO attendance (employee_id, date, status, notes)
          VALUES ($1, $2, 'on_leave', $3)
          ON CONFLICT (employee_id, date) DO UPDATE SET status = 'on_leave', notes = $3
        `, [request.employee_id, dateStr, `On approved ${request.leave_type} leave`]);
      }

    } else {
      // Deduct pending, leave balances remaining goes back
      await pgClient.query(`
        UPDATE leave_balances 
        SET pending_days = pending_days - $1
        WHERE employee_id = $2 AND year = $3 AND leave_type = $4
      `, [request.days, request.employee_id, year, request.leave_type]);
    }

    // Update request status
    const updateRes = await pgClient.query(`
      UPDATE leave_requests SET
        status = $1,
        reviewed_by = $2,
        reviewed_at = NOW(),
        rejection_reason = $3
      WHERE id = $4
      RETURNING *
    `, [status, req.user?.employeeId, rejectionReason || null, id]);

    await pgClient.query('COMMIT');

    return res.status(200).json({
      message: `Leave request ${status} successfully.`,
      request: updateRes.rows[0]
    });
  } catch (err: any) {
    await pgClient.query('ROLLBACK');
    console.error('Approve/Reject leave error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    pgClient.release();
  }
};
