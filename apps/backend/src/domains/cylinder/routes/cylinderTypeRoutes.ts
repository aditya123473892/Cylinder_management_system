import { Router } from 'express';
import { CylinderTypeController } from '../controllers/cylinderTypeController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const cylinderTypeController = new CylinderTypeController();

// GET /api/cylinder-types - Get all cylinder types
router.get('/', AuthMiddleware.authenticate, (req, res) => cylinderTypeController.getAllCylinderTypes(req, res));

// GET /api/cylinder-types/:id - Get cylinder type by ID
router.get('/:id', AuthMiddleware.authenticate, (req, res) => cylinderTypeController.getCylinderTypeById(req, res));

// POST /api/cylinder-types - Create new cylinder type (Admin/Manager only)
router.post('/', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER'), (req, res) => cylinderTypeController.createCylinderType(req, res));

// PUT /api/cylinder-types/:id - Update cylinder type by ID (Admin/Manager only)
router.put('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER'), (req, res) => cylinderTypeController.updateCylinderType(req, res));

// DELETE /api/cylinder-types/:id - Delete cylinder type by ID (Admin only)
router.delete('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN'), (req, res) => cylinderTypeController.deleteCylinderType(req, res));

export default router;
