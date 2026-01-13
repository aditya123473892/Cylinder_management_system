import { Router, Request, Response } from 'express';
import { DriverController } from '../controllers/driverController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const driverController = new DriverController();

// GET /api/drivers - Get all drivers
router.get('/', AuthMiddleware.authenticate, (req: Request, res: Response) => driverController.getAllDrivers(req, res));

// GET /api/drivers/:id - Get driver by ID
router.get('/:id', AuthMiddleware.authenticate, (req: Request, res: Response) => driverController.getDriverById(req, res));

// POST /api/drivers - Create new driver (Admin/Manager only)
router.post('/', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER'), (req: Request, res: Response) => driverController.createDriver(req, res));

// PUT /api/drivers/:id - Update driver by ID (Admin/Manager only)
router.put('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER'), (req: Request, res: Response) => driverController.updateDriver(req, res));

// DELETE /api/drivers/:id - Delete driver by ID (Admin only)
router.delete('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN'), (req: Request, res: Response) => driverController.deleteDriver(req, res));

export default router;
