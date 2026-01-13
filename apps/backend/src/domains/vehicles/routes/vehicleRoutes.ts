import { Router, Request, Response } from 'express';
import { VehicleController } from '../controllers/vehicleController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const vehicleController = new VehicleController();

// GET /api/vehicles - Get all vehicles
router.get('/', AuthMiddleware.authenticate, (req: Request, res: Response) => vehicleController.getAllVehicles(req, res));

// GET /api/vehicles/:id - Get vehicle by ID
router.get('/:id', AuthMiddleware.authenticate, (req: Request, res: Response) => vehicleController.getVehicleById(req, res));

// POST /api/vehicles - Create new vehicle (Admin/Manager only)
router.post('/', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER'), (req: Request, res: Response) => vehicleController.createVehicle(req, res));

// PUT /api/vehicles/:id - Update vehicle by ID (Admin/Manager only)
router.put('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER'), (req: Request, res: Response) => vehicleController.updateVehicle(req, res));

// DELETE /api/vehicles/:id - Delete vehicle by ID (Admin only)
router.delete('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN'), (req: Request, res: Response) => vehicleController.deleteVehicle(req, res));

export default router;
