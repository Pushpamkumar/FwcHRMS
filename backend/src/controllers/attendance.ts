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

    // Use IST timezone to get the correct local date (avoids UTC offset issues)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Check if already checked in today
    const checkRes = await pgPool.query(
      "SELECT id FROM attendance WHERE employee_id = $1 AND date::text = $2",
      [employeeId, today]
    );

    if (checkRes.rows.length > 0) {
      return res.status(400).json({ message: 'Already checked in for today.' });
    }

    const checkInTime = new Date();
    // Entry point: 9:00 AM. Grace period until 9:10 AM.
    // present  → 9:00–9:10 AM
    // late     → after 9:10 AM
    const totalMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
    const graceCutoffMinutes = 9 * 60 + 10; // 9:10 AM = 550 minutes
    const lateByMinutes = Math.max(0, totalMinutes - graceCutoffMinutes);
    const status = totalMinutes > graceCutoffMinutes ? 'late' : 'present';

    const insertRes = await pgPool.query(`
      INSERT INTO attendance (
        employee_id, date, check_in, check_in_ip, check_in_location, status
      ) VALUES ($1, $2::date, $3, $4, $5, $6)
      RETURNING id, employee_id, date::text as date, check_in, check_out, status, total_hours, notes
    `, [employeeId, today, checkInTime, ip, location ? JSON.stringify(location) : null, status]);

    const message = status === 'late'
      ? `Clock-in recorded. You are late by ${lateByMinutes} minute${lateByMinutes !== 1 ? 's' : ''}.`
      : 'Clock-in recorded successfully. You are on time!';

    return res.status(200).json({
      message,
      status,
      lateByMinutes: status === 'late' ? lateByMinutes : 0,
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

    // Use IST timezone to get the correct local date (avoids UTC offset issues)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Get today's check-in record
    const checkRes = await pgPool.query(
      "SELECT id, check_in FROM attendance WHERE employee_id = $1 AND date::text = $2 LIMIT 1",
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
      RETURNING id, employee_id, date::text as date, check_in, check_out, status, total_hours, notes
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
      "SELECT id, employee_id, date::text as date, check_in, check_out, status, total_hours, notes FROM attendance WHERE employee_id = $1 ORDER BY date DESC LIMIT 30",
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
