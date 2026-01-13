import { Router } from 'express';
import { LocationController } from '../controllers/locationController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const controller = new LocationController();

// GET /api/locations - Get all locations
router.get('/', AuthMiddleware.authenticate, (req, res) => controller.getAllLocations(req, res));

// GET /api/locations/:id - Get location by ID
router.get('/:id', AuthMiddleware.authenticate, (req, res) => controller.getLocationById(req, res));

// POST /api/locations - Create new location (Admin/Manager only)
router.post('/', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER'), (req, res) => controller.createLocation(req, res));

// PUT /api/locations/:id - Update location (Admin/Manager only)
router.put('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER'), (req, res) => controller.updateLocation(req, res));

// DELETE /api/locations/:id - Delete location (Admin only)
router.delete('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN'), (req, res) => controller.deleteLocation(req, res));

export default router;
