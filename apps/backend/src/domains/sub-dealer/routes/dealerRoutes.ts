import { Router } from 'express';
import { DealerController } from '../controllers/dealerController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const dealerController = new DealerController();

// GET /api/dealers - Get all dealers
router.get('/', AuthMiddleware.authenticate, (req, res) => dealerController.getAllDealers(req, res));

// GET /api/dealers/:id - Get dealer by ID
router.get('/:id', AuthMiddleware.authenticate, (req, res) => dealerController.getDealerById(req, res));

// POST /api/dealers - Create new dealer (Admin/Manager only)
router.post('/', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER'), (req, res) => dealerController.createDealer(req, res));

// PUT /api/dealers/:id - Update dealer by ID (Admin/Manager/User for now)
router.put('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER', 'USER'), (req, res) => dealerController.updateDealer(req, res));

// DELETE /api/dealers/:id - Delete dealer by ID (Admin only)
router.delete('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN'), (req, res) => dealerController.deleteDealer(req, res));

export default router;
