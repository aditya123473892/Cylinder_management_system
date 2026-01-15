import { Router, Request, Response } from 'express';
import { GRController } from '../controllers/grController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const grController = new GRController();

// GET /api/gr - Get all GRs
router.get('/', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.getAllGRs(req, res));

// GET /api/gr/:id - Get GR by ID
router.get('/:id', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.getGRById(req, res));

// GET /api/gr/approved/all - Get all approved/finalized GRs
router.get('/approved/all', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.getApprovedGRs(req, res));

// GET /api/gr/preview/:deliveryId - Get GR preview for delivery
router.get('/preview/:deliveryId', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.getGRPreview(req, res));

// GET /api/gr/check/:deliveryId - Check if GR exists for delivery
router.get('/check/:deliveryId', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.checkGRExists(req, res));

// POST /api/gr - Create new GR
router.post('/', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.createGR(req, res));

// PUT /api/gr/:id/approve - Approve GR
router.put('/:id/approve', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.approveGR(req, res));

// PUT /api/gr/:id/finalize - Finalize approved GR
router.put('/:id/finalize', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.finalizeGR(req, res));

export default router;
