import { Router } from 'express';
import { CylinderInventoryController } from '../controllers/cylinderInventoryController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const cylinderInventoryController = new CylinderInventoryController();

// GET /api/cylinder-inventory/summary - Get inventory summary by cylinder type
router.get('/summary', AuthMiddleware.authenticate, (req, res) =>
  cylinderInventoryController.getInventorySummary(req, res));

// GET /api/cylinder-inventory/locations - Get location summary
router.get('/locations', AuthMiddleware.authenticate, (req, res) =>
  cylinderInventoryController.getLocationSummary(req, res));

// GET /api/cylinder-inventory - Get inventory by location
router.get('/', AuthMiddleware.authenticate, (req, res) =>
  cylinderInventoryController.getInventoryByLocation(req, res));

// POST /api/cylinder-inventory/movements - Record manual cylinder movement
router.post('/movements', AuthMiddleware.authenticate, (req, res) =>
  cylinderInventoryController.recordMovement(req, res));

// POST /api/cylinder-inventory/delivery-movements - Record delivery cylinder movement (YARD -> VEHICLE)
router.post('/delivery-movements', AuthMiddleware.authenticate, (req, res) =>
  cylinderInventoryController.recordDeliveryMovement(req, res));

// POST /api/cylinder-inventory/gr-movements - Record GR approval cylinder movement (VEHICLE -> CUSTOMER)
router.post('/gr-movements', AuthMiddleware.authenticate, (req, res) =>
  cylinderInventoryController.recordGrApprovalMovement(req, res));

// POST /api/cylinder-inventory/return-movements - Record cylinder return movement (CUSTOMER -> VEHICLE -> YARD)
router.post('/return-movements', AuthMiddleware.authenticate, (req, res) =>
  cylinderInventoryController.recordReturnMovement(req, res));

// GET /api/cylinder-inventory/movements - Get movement logs
router.get('/movements', AuthMiddleware.authenticate, (req, res) =>
  cylinderInventoryController.getMovementLogs(req, res));

// GET /api/cylinder-inventory/movements/cylinder/:cylinderTypeId - Get movements by cylinder type
router.get('/movements/cylinder/:cylinderTypeId', AuthMiddleware.authenticate, (req, res) =>
  cylinderInventoryController.getMovementsByCylinderType(req, res));

// GET /api/cylinder-inventory/movements/transaction/:transactionId - Get movements by transaction
router.get('/movements/transaction/:transactionId', AuthMiddleware.authenticate, (req, res) =>
  cylinderInventoryController.getMovementsByTransaction(req, res));

// POST /api/cylinder-inventory/initialize - Initialize inventory with starting quantities
router.post('/initialize', AuthMiddleware.authenticate, (req, res) =>
  cylinderInventoryController.initializeInventory(req, res));

export default router;
