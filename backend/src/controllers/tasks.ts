import { Response } from 'express';
import { pgPool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// 1. GET LOGGED IN USER'S TASKS
export const getMyTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const result = await pgPool.query(
      'SELECT * FROM tasks WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Fetch own tasks error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// 2. CREATE A TASK FOR A TEAM MEMBER (For Managers/Admin)
export const createTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId, text, dueDate } = req.body;
    const managerId = req.user?.id;
    const managerEmpId = req.user?.employeeId;

    if (!managerId || !managerEmpId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!employeeId || !text) {
      return res.status(400).json({ message: 'Mandatory fields: employeeId, text.' });
    }

    // Verify employee reports to this manager, or check if admin
    const employee = await require('../models').User.findOne({ employeeId, reportingManagerId: managerId });
    if (!employee && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. You can only assign tasks to your team members.' });
    }

    const result = await pgPool.query(`
      INSERT INTO tasks (
        employee_id, assigned_by, text, completed, status, due_date
      ) VALUES ($1, $2, $3, false, 'review', $4)
      RETURNING *
    `, [employeeId, managerEmpId, text, dueDate || null]);

    return res.status(201).json({
      message: 'Task assigned successfully.',
      task: result.rows[0],
    });
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// 3. TOGGLE TASK COMPLETION
export const toggleTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { completed } = req.body; // boolean
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (completed === undefined) {
      return res.status(400).json({ message: 'Completed status is required.' });
    }

    // Check ownership
    const taskCheck = await pgPool.query(
      'SELECT employee_id FROM tasks WHERE id = $1 LIMIT 1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const targetEmployeeId = taskCheck.rows[0].employee_id;
    if (targetEmployeeId !== employeeId && req.user?.role !== 'manager' && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const status = completed ? 'done' : 'review';

    const result = await pgPool.query(`
      UPDATE tasks SET
        completed = $1,
        status = $2
      WHERE id = $3
      RETURNING *
    `, [completed, status, id]);

    return res.status(200).json({
      message: 'Task toggled successfully.',
      task: result.rows[0],
    });
  } catch (err) {
    console.error('Toggle task error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
