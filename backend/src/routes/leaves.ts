import { Router } from 'express';
import { getBalances, applyLeave, getPendingRequests, approveRejectLeave } from '../controllers/leaves';
import { authenticateJWT, roleGuard } from '../middleware/auth';

const router = Router();

router.get('/balance', authenticateJWT, getBalances);
router.post('/apply', authenticateJWT, applyLeave);
router.get('/requests', authenticateJWT, roleGuard('admin', 'manager'), getPendingRequests);
router.put('/requests/:id', authenticateJWT, roleGuard('admin', 'manager'), approveRejectLeave);

export default router;
