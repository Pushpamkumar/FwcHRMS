import { Router } from 'express';
import { chatWithBot } from '../controllers/ai';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/chat', authenticateJWT, chatWithBot);

export default router;
