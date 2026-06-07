import { Router } from 'express';
import {
  getStructure,
  updateStructure,
  runPayroll,
  getPayslipUrl,
  getMonthlyRuns,
} from '../controllers/payroll';
import { authenticateJWT, roleGuard } from '../middleware/auth';

const router = Router();

// Employee can get their own structure, Admin can get any structure
router.get('/structure/:employeeId', authenticateJWT, getStructure);

// Admin-only payroll configuration and runs
router.post('/structure', authenticateJWT, roleGuard('admin'), updateStructure);
router.post('/run', authenticateJWT, roleGuard('admin'), runPayroll);
router.get('/runs/:month/:year', authenticateJWT, roleGuard('admin'), getMonthlyRuns);

// Employee can get their own processed payslip URL
router.get('/payslip/:month/:year', authenticateJWT, getPayslipUrl);

export default router;
