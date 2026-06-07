import { Router } from 'express';
import {
  createJob,
  listJobs,
  applyToJob,
  getApplications,
  updateStage,
} from '../controllers/recruitment';
import { authenticateJWT, roleGuard } from '../middleware/auth';

const router = Router();

// Public routes for candidates
router.get('/jobs', listJobs);
router.post('/jobs/:jobId/apply', applyToJob);

// Admin / HR Recruiter authenticated operations
router.post('/jobs', authenticateJWT, roleGuard('admin', 'hr_recruiter'), createJob);
router.get('/jobs/:jobId/applications', authenticateJWT, roleGuard('admin', 'hr_recruiter'), getApplications);
router.put('/recruitment/:id/stage', authenticateJWT, roleGuard('admin', 'hr_recruiter'), updateStage);

export default router;
