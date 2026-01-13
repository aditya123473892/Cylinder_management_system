import { UserRepository } from '../repositories/userRepository';
import { AuthUtils } from '../../../shared/utils/auth';
import { LoginRequest, AuthResponse } from '../types/user';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Validate input
      if (!data.Email || !AuthUtils.validateEmail(data.Email)) {
        throw new Error('Valid email is required');
      }
      if (!data.Password) {
        throw new Error('Password is required');
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(data.Email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.IsActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await AuthUtils.verifyPassword(data.Password, user.PasswordHash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.UserId);

      // Generate token
      const token = AuthUtils.generateToken({
        userId: user.UserId,
        email: user.Email,
        role: user.Role,
      });

      return {
        user: {
          UserId: user.UserId,
          FullName: user.FullName,
          Email: user.Email,
          Role: user.Role,
          CustomerId: user.CustomerId,
        },
        token,
      };
    } catch (error) {
      console.error('Error during login:', error);
      throw error instanceof Error ? error : new Error('Login failed');
    }
  }

  async signup(data: { FullName: string; Email: string; Password: string; Role?: string }): Promise<AuthResponse> {
    try {
      // Create user using UserService
      const userService = new (await import('./userServices')).UserService();
      const user = await userService.createUser(data);

      // Generate token
      const token = AuthUtils.generateToken({
        userId: user.UserId,
        email: user.Email,
        role: user.Role,
      });

      return {
        user: {
          UserId: user.UserId,
          FullName: user.FullName,
          Email: user.Email,
          Role: user.Role,
          CustomerId: user.CustomerId,
        },
        token,
      };
    } catch (error) {
      console.error('Error during signup:', error);
      throw error instanceof Error ? error : new Error('Signup failed');
    }
  }
}
