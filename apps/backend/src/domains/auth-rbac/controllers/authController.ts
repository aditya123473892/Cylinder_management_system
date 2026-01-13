import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { LoginRequest } from '../types/user';
import { body, validationResult } from 'express-validator';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Validation rules
  static loginValidation = [
    body('Email').isEmail().normalizeEmail(),
    body('Password').notEmpty().trim(),
  ];

  static signupValidation = [
    body('FullName').trim().isLength({ min: 2, max: 150 }),
    body('Email').isEmail().normalizeEmail(),
    body('Password').isLength({ min: 8 }),
    body('Role').optional().isIn(['ADMIN', 'MANAGER', 'OPERATOR', 'USER']),
  ];

  async login(req: Request, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const data: LoginRequest = req.body;
      const result = await this.authService.login(data);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Error in login:', error);
      const statusCode = error instanceof Error &&
        error.message.includes('Invalid') ? 401 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Login failed'
      });
    }
  }

  async signup(req: Request, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const data = req.body;
      const result = await this.authService.signup(data);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Account created successfully'
      });
    } catch (error) {
      console.error('Error in signup:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('already') || error.message.includes('required')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Signup failed'
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    // In a stateless JWT system, logout is handled on the client side
    // by removing the token from storage
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  }

  async profile(req: Request, res: Response): Promise<void> {
    try {
      // User info is available from auth middleware
      const user = req.user;

      res.status(200).json({
        success: true,
        data: {
          UserId: user.userId,
          FullName: user.fullName,
          Email: user.email,
          Role: user.role,
        },
        message: 'Profile retrieved successfully'
      });
    } catch (error) {
      console.error('Error in profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile'
      });
    }
  }
}
