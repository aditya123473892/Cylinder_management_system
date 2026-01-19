import { Router } from 'express';
import { CylinderInventoryController } from '../controllers/cylinderInventoryController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const inventoryController = new CylinderInventoryController();

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticate);

// GET /api/cylinder-inventory - Get inventory with optional filters
router.get('/', (req, res) => inventoryController.getInventory(req, res));

// GET /api/cylinder-inventory/summary - Get inventory summary by cylinder type and location
router.get('/summary', (req, res) => inventoryController.getInventorySummary(req, res));

// GET /api/cylinder-inventory/dashboard - Get dashboard data with alerts
router.get('/dashboard', (req, res) => inventoryController.getInventoryDashboard(req, res));

// GET /api/cylinder-inventory/available/:cylinderTypeId/:locationType/:referenceId?/:cylinderStatus? - Get available quantity
router.get('/available/:cylinderTypeId/:locationType/:referenceId?/:cylinderStatus?', (req, res) =>
  inventoryController.getAvailableQuantity(req, res)
);

// GET /api/cylinder-inventory/movements - Get cylinder movements with optional filters
router.get('/movements', (req, res) => inventoryController.getCylinderMovements(req, res));

export default router;
