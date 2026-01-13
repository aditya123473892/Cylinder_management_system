import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { UserMaster, CreateUserRequest, UpdateUserRequest } from '../types/user';

export class UserRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<UserMaster[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT UserId, FullName, Email, PasswordHash, Role, CustomerId, IsActive, LastLoginAt, CreatedAt, CreatedBy
      FROM dbo.USER_MASTER
      ORDER BY UserId
    `);
    return result.recordset;
  }

  async findById(id: number): Promise<UserMaster | null> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT UserId, FullName, Email, PasswordHash, Role, CustomerId, IsActive, LastLoginAt, CreatedAt, CreatedBy
        FROM dbo.USER_MASTER
        WHERE UserId = @id
      `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async findByEmail(email: string): Promise<UserMaster | null> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar(150), email)
      .query(`
        SELECT UserId, FullName, Email, PasswordHash, Role, CustomerId, IsActive, LastLoginAt, CreatedAt, CreatedBy
        FROM dbo.USER_MASTER
        WHERE Email = @email
      `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async create(data: CreateUserRequest & { PasswordHash: string }): Promise<UserMaster> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('FullName', sql.NVarChar(150), data.FullName)
      .input('Email', sql.NVarChar(150), data.Email)
      .input('PasswordHash', sql.NVarChar(255), data.PasswordHash)
      .input('Role', sql.NVarChar(30), data.Role || 'USER')
      .input('CustomerId', sql.Int, data.CustomerId ?? null)
      .input('IsActive', sql.Bit, true)
      .input('CreatedBy', sql.Int, data.CreatedBy ?? null)
      .query(`
        INSERT INTO dbo.USER_MASTER (FullName, Email, PasswordHash, Role, CustomerId, IsActive, CreatedBy)
        OUTPUT INSERTED.*
        VALUES (@FullName, @Email, @PasswordHash, @Role, @CustomerId, @IsActive, @CreatedBy)
      `);
    return result.recordset[0];
  }

  async updateLastLogin(userId: number): Promise<void> {
    const pool = await this.getPool();
    await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE dbo.USER_MASTER
        SET LastLoginAt = GETDATE()
        WHERE UserId = @userId
      `);
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT 1 FROM dbo.USER_MASTER WHERE UserId = @id');
    return result.recordset.length > 0;
  }

  async emailExists(email: string, excludeUserId?: number): Promise<boolean> {
    const pool = await this.getPool();
    let query = 'SELECT 1 FROM dbo.USER_MASTER WHERE Email = @email';
    const request = pool.request().input('email', sql.NVarChar(150), email);
    
    if (excludeUserId) {
      query += ' AND UserId != @excludeUserId';
      request.input('excludeUserId', sql.Int, excludeUserId);
    }
    
    const result = await request.query(query);
    return result.recordset.length > 0;
  }
}
