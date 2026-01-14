import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const customerController = new CustomerController();

// GET /api/customers - Get all customers
router.get('/', AuthMiddleware.authenticate, (req, res) => customerController.getAllCustomers(req, res));

// GET /api/customers/:id - Get customer by ID
router.get('/:id', AuthMiddleware.authenticate, (req, res) => customerController.getCustomerById(req, res));

// POST /api/customers - Create new customer (Admin/Manager only)
router.post('/', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER'), (req, res) => customerController.createCustomer(req, res));

// PUT /api/customers/:id - Update customer by ID (Admin/Manager/User for now)
router.put('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN', 'MANAGER', 'USER'), (req, res) => customerController.updateCustomer(req, res));

// DELETE /api/customers/:id - Delete customer by ID (Admin only)
router.delete('/:id', AuthMiddleware.authenticate, AuthMiddleware.authorize('ADMIN'), (req, res) => customerController.deleteCustomer(req, res));

export default router;
