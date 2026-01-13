import { UserRepository } from '../repositories/userRepository';
import { AuthUtils } from '../../../shared/utils/auth';
import { UserMaster, CreateUserRequest, UpdateUserRequest } from '../types/user';

export class UserService {
  private repository: UserRepository;

  constructor() {
    this.repository = new UserRepository();
  }

  async getAllUsers(): Promise<UserMaster[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  async getUserById(id: number): Promise<UserMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid user ID');
      }
      return await this.repository.findById(id);
    } catch (error) {
      console.error(`Error fetching user with id ${id}:`, error);
      throw new Error('Failed to fetch user');
    }
  }

  async createUser(data: CreateUserRequest): Promise<UserMaster> {
    try {
      // Validate required fields
      if (!data.FullName || data.FullName.trim().length === 0) {
        throw new Error('Full name is required');
      }
      if (!data.Email || !AuthUtils.validateEmail(data.Email)) {
        throw new Error('Valid email is required');
      }
      if (!data.Password) {
        throw new Error('Password is required');
      }

      // Validate password strength
      const passwordValidation = AuthUtils.validatePassword(data.Password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Check if email already exists
      const emailExists = await this.repository.emailExists(data.Email);
      if (emailExists) {
        throw new Error('Email already registered');
      }

      // Hash password
      const passwordHash = await AuthUtils.hashPassword(data.Password);

      return await this.repository.create({
        ...data,
        PasswordHash: passwordHash,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      throw error instanceof Error ? error : new Error('Failed to create user');
    }
  }
}
