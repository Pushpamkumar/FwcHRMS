import { Router } from 'express';
import {
  submitTimesheet,
  getMyTimesheets,
  getTeamTimesheets,
  updateTimesheetStatus,
} from '../controllers/timesheets';
import { authenticateJWT, roleGuard } from '../middleware/auth';

const router = Router();

router.post('/', authenticateJWT, submitTimesheet);
router.get('/my', authenticateJWT, getMyTimesheets);
router.get('/team', authenticateJWT, roleGuard('manager', 'admin'), getTeamTimesheets);
router.put('/:id/status', authenticateJWT, roleGuard('manager', 'admin'), updateTimesheetStatus);

export default router;
