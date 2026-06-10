import { Response } from 'express';
import { pgPool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// 1. Employee submits a weekly timesheet
export const submitTimesheet = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { weekStartDate, hoursLogged, description } = req.body;
    const employeeId = req.user?.employeeId;
    const fullName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || employeeId || 'Unknown';

    if (!employeeId) return res.status(401).json({ message: 'Unauthorized.' });
    if (!weekStartDate || !hoursLogged) return res.status(400).json({ message: 'weekStartDate and hoursLogged are required.' });

    const result = await pgPool.query(`
      INSERT INTO timesheets (employee_id, employee_name, week_start_date, hours_logged, description, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      ON CONFLICT (employee_id, week_start_date)
      DO UPDATE SET hours_logged = $4, description = $5, status = 'pending', updated_at = NOW()
      RETURNING *
    `, [employeeId, fullName, weekStartDate, hoursLogged, description || null]);

    return res.status(201).json({ message: 'Timesheet submitted.', timesheet: result.rows[0] });
  } catch (err: any) {
    console.error('Submit timesheet error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// 2. Get my timesheets (employee)
export const getMyTimesheets = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(401).json({ message: 'Unauthorized.' });

    const result = await pgPool.query(
      'SELECT * FROM timesheets WHERE employee_id = $1 ORDER BY week_start_date DESC LIMIT 20',
      [employeeId]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Get my timesheets error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// 3. Manager gets team's pending timesheets
export const getTeamTimesheets = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const managerId = req.user?.id;
    if (!managerId) return res.status(401).json({ message: 'Unauthorized.' });

    // Get direct reports from MongoDB
    const directReports = await require('../models').User.find(
      { reportingManagerId: managerId },
      'employeeId'
    );
    const ids = directReports.map((r: any) => r.employeeId);

    if (ids.length === 0) return res.status(200).json([]);

    const result = await pgPool.query(
      `SELECT * FROM timesheets WHERE employee_id = ANY($1) ORDER BY created_at DESC LIMIT 50`,
      [ids]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Get team timesheets error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// 4. Manager approves or rejects a timesheet
export const updateTimesheetStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected.' });
    }

    const result = await pgPool.query(
      `UPDATE timesheets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Timesheet not found.' });
    return res.status(200).json({ message: `Timesheet ${status}.`, timesheet: result.rows[0] });
  } catch (err) {
    console.error('Update timesheet status error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
