import { Router } from 'express';
import { getMyGoals, getEmployeeGoals, createGoal, updateGoalProgress } from '../controllers/goals';
import { authenticateJWT, roleGuard } from '../middleware/auth';

const router = Router();

router.get('/my', authenticateJWT, getMyGoals);
router.get('/team/:employeeId', authenticateJWT, getEmployeeGoals);
router.post('/', authenticateJWT, roleGuard('manager', 'admin'), createGoal);
router.put('/:id/progress', authenticateJWT, updateGoalProgress);

export default router;
