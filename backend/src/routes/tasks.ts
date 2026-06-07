import { Router } from 'express';
import { getMyTasks, createTask, toggleTask } from '../controllers/tasks';
import { authenticateJWT, roleGuard } from '../middleware/auth';

const router = Router();

router.get('/my', authenticateJWT, getMyTasks);
router.post('/', authenticateJWT, roleGuard('manager', 'admin'), createTask);
router.put('/:id/toggle', authenticateJWT, toggleTask);

export default router;
