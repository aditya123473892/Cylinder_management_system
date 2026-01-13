import { Router, Request, Response } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthMiddleware } from '../../../shared/middleware/auth';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/login', AuthController.loginValidation, (req: Request, res: Response) =>
  authController.login(req, res)
);

router.post('/signup', AuthController.signupValidation, (req: Request, res: Response) =>
  authController.signup(req, res)
);

// Protected routes
router.post('/logout', AuthMiddleware.authenticate, (req: Request, res: Response) =>
  authController.logout(req, res)
);

router.get('/profile', AuthMiddleware.authenticate, (req: Request, res: Response) =>
  authController.profile(req, res)
);

export default router;
