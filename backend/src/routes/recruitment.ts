import { Router } from 'express';
import {
  createJob,
  listJobs,
  applyToJob,
  getApplications,
  updateStage,
  getMyApplications,
  aiAnalyzeResume,
  requestOfferApproval,
  processOfferApproval,
  scheduleGoogleMeet,
  getMyNotifications,
  markNotificationAsRead,
  processOfferCandidate,
  getPendingOffers,
} from '../controllers/recruitment';
import { authenticateJWT, roleGuard } from '../middleware/auth';

const router = Router();

// Notifications
router.get('/notifications', authenticateJWT, getMyNotifications);
router.put('/notifications/:id/read', authenticateJWT, markNotificationAsRead);

// Candidate features
router.get('/my-applications', authenticateJWT, roleGuard('candidate', 'admin'), getMyApplications);
router.post('/ai-analyze', authenticateJWT, roleGuard('candidate', 'admin'), aiAnalyzeResume);
router.post('/applications/:id/offer-action', authenticateJWT, roleGuard('candidate', 'admin'), processOfferCandidate);

// Public routes for candidates (with optional candidate headers)
router.get('/jobs', listJobs);
router.post('/jobs/:jobId/apply', applyToJob);

// Admin / HR Recruiter authenticated operations
router.post('/jobs', authenticateJWT, roleGuard('admin', 'hr_recruiter'), createJob);
router.get('/jobs/:jobId/applications', authenticateJWT, roleGuard('admin', 'hr_recruiter'), getApplications);
router.put('/recruitment/:id/stage', authenticateJWT, roleGuard('admin', 'hr_recruiter'), updateStage);

// Recruiter actions
router.post('/applications/:id/request-offer', authenticateJWT, roleGuard('admin', 'hr_recruiter'), requestOfferApproval);
router.post('/applications/:id/schedule-meet', authenticateJWT, roleGuard('admin', 'hr_recruiter'), scheduleGoogleMeet);

// Manager actions
router.get('/pending-offers', authenticateJWT, roleGuard('admin', 'manager'), getPendingOffers);
router.post('/applications/:id/process-offer', authenticateJWT, roleGuard('admin', 'manager'), processOfferApproval);

export default router;
