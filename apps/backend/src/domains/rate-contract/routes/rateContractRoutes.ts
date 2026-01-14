import { Router, Request, Response } from 'express';
import { RateContractController } from '../controllers/rateContractController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const rateContractController = new RateContractController();

// GET /api/rate-contracts - Get all rate contracts
router.get('/', AuthMiddleware.authenticate, (req: Request, res: Response) => rateContractController.getAllRateContracts(req, res));

// GET /api/rate-contracts/active - Get active rate contracts for specific criteria
router.get('/active', AuthMiddleware.authenticate, (req: Request, res: Response) => rateContractController.getActiveRateContracts(req, res));

// GET /api/rate-contracts/:id - Get rate contract by ID
router.get('/:id', AuthMiddleware.authenticate, (req: Request, res: Response) => rateContractController.getRateContractById(req, res));

// POST /api/rate-contracts - Create new rate contract (Admin/Manager/User for now)
router.post('/', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER', 'USER'), (req: Request, res: Response) => rateContractController.createRateContract(req, res));

// PUT /api/rate-contracts/:id - Update rate contract by ID (Admin/Manager/User for now)
router.put('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER', 'USER'), (req: Request, res: Response) => rateContractController.updateRateContract(req, res));

// DELETE /api/rate-contracts/:id - Delete rate contract by ID (Admin/User for now)
router.delete('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'USER'), (req: Request, res: Response) => rateContractController.deleteRateContract(req, res));

export default router;
