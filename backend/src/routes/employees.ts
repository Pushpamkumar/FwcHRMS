import { Router } from 'express';
import {
  listEmployees,
  createEmployee,
  getEmployee,
  updateEmployee,
  bulkImport,
  getOrgChart,
  getAdminStats,
  listDepartments,
  resolveAlertAction,
  exportReport,
  getBadgeCounts,
  getEmployeePerformanceStats,
  createEmployeeAppraisal,
} from '../controllers/employees';
import { authenticateJWT, roleGuard } from '../middleware/auth';

const router = Router();

// Org chart, stats, and departments routes (must be registered BEFORE parameterized route /:id)
router.get('/org-chart', authenticateJWT, getOrgChart);
router.get('/admin-stats', authenticateJWT, roleGuard('admin'), getAdminStats);
router.get('/departments', authenticateJWT, listDepartments);
router.get('/export-report', authenticateJWT, roleGuard('admin'), exportReport);
router.get('/badge-counts', authenticateJWT, getBadgeCounts);
router.post('/alerts/:id/action', authenticateJWT, roleGuard('admin'), resolveAlertAction);

// Performance / Appraisal routes (must be registered BEFORE /:id detail route)
router.get('/:id/performance-stats', authenticateJWT, getEmployeePerformanceStats);
router.post('/:id/appraisal', authenticateJWT, roleGuard('manager', 'admin'), createEmployeeAppraisal);

// Employee detail routes
router.get('/:id', authenticateJWT, getEmployee);
router.put('/:id', authenticateJWT, updateEmployee);

// Admin-only creation and import routes
router.post('/', authenticateJWT, roleGuard('admin'), createEmployee);
router.post('/bulk-import', authenticateJWT, roleGuard('admin'), bulkImport);

// List employees route (accessible to admin, hr, manager, but managers are filtered by controller logic)
router.get('/', authenticateJWT, roleGuard('admin', 'hr_recruiter', 'manager'), listEmployees);

export default router;
