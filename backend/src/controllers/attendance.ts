import { Response } from 'express';
import { pgPool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// ==========================================
// 1. CLOCK IN
// ==========================================
export const checkIn = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const { location } = req.body; // e.g. { lat, lng, address }

    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const checkRes = await pgPool.query(
      'SELECT id FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (checkRes.rows.length > 0) {
      return res.status(400).json({ message: 'Already checked in for today.' });
    }

    const checkInTime = new Date();
    // Mark as late if after 9:15 AM (9.25 hours)
    const currentHour = checkInTime.getHours() + checkInTime.getMinutes() / 60;
    const status = currentHour > 9.25 ? 'late' : 'present';

    const insertRes = await pgPool.query(`
      INSERT INTO attendance (
        employee_id, date, check_in, check_in_ip, check_in_location, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [employeeId, today, checkInTime, ip, location ? JSON.stringify(location) : null, status]);

    return res.status(200).json({
      message: 'Clock-in recorded successfully.',
      record: insertRes.rows[0],
    });
  } catch (err: any) {
    console.error('Check-in error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 2. CLOCK OUT
// ==========================================
export const checkOut = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const { location } = req.body;

    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get today's check-in record
    const checkRes = await pgPool.query(
      'SELECT id, check_in FROM attendance WHERE employee_id = $1 AND date = $2 LIMIT 1',
      [employeeId, today]
    );

    if (checkRes.rows.length === 0) {
      return res.status(400).json({ message: 'No check-in record found for today. Please clock in first.' });
    }

    const record = checkRes.rows[0];
    if (!record.check_in) {
      return res.status(400).json({ message: 'No check-in timestamp found.' });
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(record.check_in);
    
    // Compute total hours
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    const updateRes = await pgPool.query(`
      UPDATE attendance SET
        check_out = $1,
        check_out_ip = $2,
        check_out_location = $3,
        total_hours = $4
      WHERE id = $5
      RETURNING *
    `, [checkOutTime, ip, location ? JSON.stringify(location) : null, totalHours, record.id]);

    return res.status(200).json({
      message: 'Clock-out recorded successfully.',
      record: updateRes.rows[0],
    });
  } catch (err: any) {
    console.error('Check-out error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 3. GET OWN ATTENDANCE HISTORY
// ==========================================
export const getMyHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const result = await pgPool.query(
      'SELECT * FROM attendance WHERE employee_id = $1 ORDER BY date DESC LIMIT 30',
      [employeeId]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Fetch attendance error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 4. GET TEAM ATTENDANCE (For Managers)
// ==========================================
export const getTeamHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const managerId = req.user?.employeeId;

    if (!managerId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    // Query Postgres list of employees under this manager
    // Note: reportingManagerId is on User model (Mongo). So we find manager's direct reports first.
    const directReports = await require('../models').User.find({ reportingManagerId: req.user?.id }, 'employeeId');
    const ids = directReports.map((r: any) => r.employeeId);

    if (ids.length === 0) {
      return res.status(200).json([]);
    }

    const result = await pgPool.query(
      'SELECT * FROM attendance WHERE employee_id = ANY($1) ORDER BY date DESC LIMIT 100',
      [ids]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Fetch team attendance error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
