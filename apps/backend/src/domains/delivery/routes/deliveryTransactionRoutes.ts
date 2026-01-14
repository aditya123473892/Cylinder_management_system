import { Router, Request, Response } from 'express';
import { DeliveryTransactionController } from '../controllers/deliveryTransactionController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const deliveryTransactionController = new DeliveryTransactionController();

// GET /api/delivery-transactions - Get all delivery transactions
router.get('/', AuthMiddleware.authenticate, (req: Request, res: Response) => deliveryTransactionController.getAllDeliveryTransactions(req, res));

// GET /api/delivery-transactions/:id - Get delivery transaction by ID
router.get('/:id', AuthMiddleware.authenticate, (req: Request, res: Response) => deliveryTransactionController.getDeliveryTransactionById(req, res));

// POST /api/delivery-transactions - Create new delivery transaction (authenticated users)
router.post('/', AuthMiddleware.authenticate, (req: Request, res: Response) => deliveryTransactionController.createDeliveryTransaction(req, res));

export default router;
