import { Router } from 'express';
import { checkIn, checkOut, getMyHistory, getTeamHistory } from '../controllers/attendance';
import { authenticateJWT, roleGuard } from '../middleware/auth';

const router = Router();

router.post('/check-in', authenticateJWT, checkIn);
router.put('/check-out', authenticateJWT, checkOut);
router.get('/my', authenticateJWT, getMyHistory);
router.get('/team', authenticateJWT, roleGuard('manager'), getTeamHistory);

export default router;
