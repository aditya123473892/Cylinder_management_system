import { Router } from 'express';
import { DeliveryOrderController } from '../controllers/deliveryOrderController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const controller = new DeliveryOrderController();

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticate);

// Delivery Order Management Routes
router.post('/orders', (req, res) => controller.createDeliveryOrder(req, res));
router.get('/orders', (req, res) => controller.getDeliveryOrders(req, res));
router.get('/orders/:id', (req, res) => controller.getDeliveryOrderById(req, res));
router.get('/orders/:id/vehicle', (req, res) => controller.getOrderVehicleInfo(req, res));
router.put('/orders/:id/status', (req, res) => controller.updateOrderStatus(req, res));

// Delivery Planning Routes
router.post('/plans', (req, res) => controller.createDeliveryPlan(req, res));
router.get('/plans', (req, res) => controller.getDeliveryPlans(req, res));
router.put('/plans/:id/status', (req, res) => controller.updatePlanStatus(req, res));

// Loading Process Routes
router.post('/loading/start', (req, res) => controller.startLoading(req, res));
router.post('/loading/complete', (req, res) => controller.completeLoading(req, res));

// Delivery Execution Routes
router.post('/execution/record', (req, res) => controller.recordDeliveryExecution(req, res));

// Reconciliation Routes
router.post('/reconciliation', (req, res) => controller.createReconciliation(req, res));

// Dashboard and Reporting Routes
router.get('/dashboard', (req, res) => controller.getDashboardData(req, res));
router.get('/tasks/:user_id', (req, res) => controller.getUserPendingTasks(req, res));

export default router;
