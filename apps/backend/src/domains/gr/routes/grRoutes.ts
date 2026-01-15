import { Router, Request, Response } from 'express';
import { GrController } from '../controllers/grController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const grController = new GrController();

// GET /api/gr - Get all GRs
router.get('/', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.getAllGrs(req, res));

// GET /api/gr/:id - Get GR by ID
router.get('/:id', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.getGrById(req, res));

// POST /api/gr - Create new GR
router.post('/', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.createGr(req, res));

// PUT /api/gr/:id/approve - Approve GR
router.put('/:id/approve', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.approveGr(req, res));

// PUT /api/gr/:id/finalize - Finalize GR
router.put('/:id/finalize', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.finalizeGr(req, res));

// PUT /api/gr/:id/close-trip - Close trip
router.put('/:id/close-trip', AuthMiddleware.authenticate, (req: Request, res: Response) => grController.closeTrip(req, res));

export default router;
