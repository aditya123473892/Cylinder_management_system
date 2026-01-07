import { Router } from 'express';
import { CylinderTypeController } from '../controllers/cylinderTypeController';

const router = Router();
const cylinderTypeController = new CylinderTypeController();

// GET /api/cylinder-types - Get all cylinder types
router.get('/', (req, res) => cylinderTypeController.getAllCylinderTypes(req, res));

// GET /api/cylinder-types/:id - Get cylinder type by ID
router.get('/:id', (req, res) => cylinderTypeController.getCylinderTypeById(req, res));

// POST /api/cylinder-types - Create new cylinder type
router.post('/', (req, res) => cylinderTypeController.createCylinderType(req, res));

// PUT /api/cylinder-types/:id - Update cylinder type by ID
router.put('/:id', (req, res) => cylinderTypeController.updateCylinderType(req, res));

// DELETE /api/cylinder-types/:id - Delete cylinder type by ID
router.delete('/:id', (req, res) => cylinderTypeController.deleteCylinderType(req, res));

export default router;