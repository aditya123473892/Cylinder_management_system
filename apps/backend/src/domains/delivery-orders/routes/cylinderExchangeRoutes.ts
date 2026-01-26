import { Router } from 'express';
import { CylinderExchangeController } from '../controllers/cylinderExchangeController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const controller = new CylinderExchangeController();

// Order Exchange Tracking Routes
router.post('/exchange/record', AuthMiddleware.authenticate, (req, res) => controller.recordExchange(req, res));
router.get('/exchange/tracking', AuthMiddleware.authenticate, (req, res) => controller.getExchangeTracking(req, res));
router.get('/exchange/tracking/:exchangeId', AuthMiddleware.authenticate, (req, res) => controller.getExchangeTrackingWithOrder(req, res));
router.put('/exchange/tracking/:exchangeId/acknowledge', AuthMiddleware.authenticate, (req, res) => controller.updateExchangeAcknowledgment(req, res));

// Daily Reconciliation Routes
router.post('/exchange/reconciliation', AuthMiddleware.authenticate, (req, res) => controller.createDailyReconciliation(req, res));
router.get('/exchange/reconciliation', AuthMiddleware.authenticate, (req, res) => controller.getDailyReconciliations(req, res));
router.get('/exchange/reconciliation/:reconciliationId', AuthMiddleware.authenticate, (req, res) => controller.getDailyReconciliationWithDetails(req, res));
router.put('/exchange/variance-resolution', AuthMiddleware.authenticate, (req, res) => controller.updateVarianceResolution(req, res));

// Vehicle Inventory Routes
router.post('/exchange/vehicle-inventory', AuthMiddleware.authenticate, (req, res) => controller.countVehicleInventory(req, res));
router.get('/exchange/vehicle-inventory/:planId', AuthMiddleware.authenticate, (req, res) => controller.getVehicleInventory(req, res));

// Summary and Reporting Routes
router.get('/exchange/summary/:planId', AuthMiddleware.authenticate, (req, res) => controller.getExchangeSummary(req, res));
router.get('/exchange/variance-summary/:planId', AuthMiddleware.authenticate, (req, res) => controller.getExchangeVarianceSummary(req, res));

// Approval and Status Update Routes
router.put('/exchange/reconciliation/:reconciliationId/approve', AuthMiddleware.authenticate, (req, res) => controller.approveReconciliation(req, res));
router.put('/exchange/reconciliation/:reconciliationId/status', AuthMiddleware.authenticate, (req, res) => controller.updateReconciliationStatus(req, res));

export default router;