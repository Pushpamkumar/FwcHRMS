import { Response } from 'express';
import { pgPool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// 1. GET CURRENT USER GOALS
export const getMyGoals = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const result = await pgPool.query(
      'SELECT * FROM goals WHERE employee_id = $1 ORDER BY due_date ASC',
      [employeeId]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Fetch own goals error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// 2. GET TEAM MEMBER GOALS (For Managers)
export const getEmployeeGoals = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const managerId = req.user?.id;

    if (!managerId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    // Verify employee reports to this manager
    const employee = await require('../models').User.findOne({ employeeId, reportingManagerId: managerId });
    if (!employee && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Employee is not in your team.' });
    }

    const result = await pgPool.query(
      'SELECT * FROM goals WHERE employee_id = $1 ORDER BY due_date ASC',
      [employeeId]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Fetch employee goals error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// 3. CREATE GOAL (For Managers/Admin)
export const createGoal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId, title, description, target, weight, dueDate, reviewPeriod } = req.body;
    const managerId = req.user?.id;

    if (!managerId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    // Verify employee reports to this manager
    const employee = await require('../models').User.findOne({ employeeId, reportingManagerId: managerId });
    if (!employee && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. You can only set goals for your team members.' });
    }

    if (!title || !target || !dueDate || !reviewPeriod) {
      return res.status(400).json({ message: 'Mandatory fields: title, target, dueDate, reviewPeriod.' });
    }

    const result = await pgPool.query(`
      INSERT INTO goals (
        employee_id, review_period, title, description, target, progress, status, weight, due_date
      ) VALUES ($1, $2, $3, $4, $5, 0, 'in_progress', $6, $7)
      RETURNING *
    `, [employeeId, reviewPeriod, title, description || null, target, weight || 20, dueDate]);

    return res.status(201).json({
      message: 'Performance goal created successfully.',
      goal: result.rows[0],
    });
  } catch (err) {
    console.error('Create goal error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// 4. UPDATE GOAL PROGRESS (For Employees & Managers)
export const updateGoalProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({ message: 'Progress must be a number between 0 and 100.' });
    }

    // Check if goal belongs to this employee or employee reports to manager
    const goalCheck = await pgPool.query(
      'SELECT employee_id FROM goals WHERE id = $1 LIMIT 1',
      [id]
    );

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Goal not found.' });
    }

    const targetEmployeeId = goalCheck.rows[0].employee_id;

    if (targetEmployeeId !== employeeId && req.user?.role !== 'manager' && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const status = progress === 100 ? 'completed' : 'in_progress';
    const completedAt = progress === 100 ? new Date() : null;

    const result = await pgPool.query(`
      UPDATE goals SET
        progress = $1,
        status = $2,
        completed_at = $3
      WHERE id = $4
      RETURNING *
    `, [progress, status, completedAt, id]);

    return res.status(200).json({
      message: 'Goal progress updated successfully.',
      goal: result.rows[0],
    });
  } catch (err) {
    console.error('Update goal progress error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
