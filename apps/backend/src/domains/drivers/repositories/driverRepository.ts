import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { DriverMaster, CreateDriverRequest, UpdateDriverRequest } from '../types/driver';

export class DriverRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<DriverMaster[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT driver_id, driver_name, mobile_number, license_number, license_expiry_date, is_active, created_at
      FROM dbo.DRIVER_MASTER
      ORDER BY driver_id
    `);
    return result.recordset;
  }

  async findById(id: number): Promise<DriverMaster | null> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT driver_id, driver_name, mobile_number, license_number, license_expiry_date, is_active, created_at
        FROM dbo.DRIVER_MASTER
        WHERE driver_id = @id
      `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async create(data: CreateDriverRequest): Promise<DriverMaster> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('driver_name', sql.VarChar(100), data.driver_name)
      .input('mobile_number', sql.VarChar(15), data.mobile_number)
      .input('license_number', sql.VarChar(50), data.license_number)
      .input('license_expiry_date', sql.Date, new Date(data.license_expiry_date))
      .input('is_active', sql.Bit, true)
      .query(`
        INSERT INTO dbo.DRIVER_MASTER (driver_name, mobile_number, license_number, license_expiry_date, is_active)
        OUTPUT INSERTED.*
        VALUES (@driver_name, @mobile_number, @license_number, @license_expiry_date, @is_active)
      `);
    return result.recordset[0];
  }

  async update(id: number, data: UpdateDriverRequest): Promise<DriverMaster | null> {
    const pool = await this.getPool();
    let query = 'UPDATE dbo.DRIVER_MASTER SET ';
    const updates: string[] = [];
    const request = pool.request().input('id', sql.Int, id);

    if (data.driver_name !== undefined) {
      updates.push('driver_name = @driver_name');
      request.input('driver_name', sql.VarChar(100), data.driver_name);
    }
    if (data.mobile_number !== undefined) {
      updates.push('mobile_number = @mobile_number');
      request.input('mobile_number', sql.VarChar(15), data.mobile_number);
    }
    if (data.license_number !== undefined) {
      updates.push('license_number = @license_number');
      request.input('license_number', sql.VarChar(50), data.license_number);
    }
    if (data.license_expiry_date !== undefined) {
      updates.push('license_expiry_date = @license_expiry_date');
      request.input('license_expiry_date', sql.Date, new Date(data.license_expiry_date));
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = @is_active');
      request.input('is_active', sql.Bit, data.is_active);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    query += updates.join(', ') + ' OUTPUT INSERTED.* WHERE driver_id = @id';

    const result = await request.query(query);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async delete(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.DRIVER_MASTER WHERE driver_id = @id');
    return result.rowsAffected[0] > 0;
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT 1 FROM dbo.DRIVER_MASTER WHERE driver_id = @id');
    return result.recordset.length > 0;
  }

  async licenseNumberExists(licenseNumber: string, excludeDriverId?: number): Promise<boolean> {
    const pool = await this.getPool();
    let query = 'SELECT 1 FROM dbo.DRIVER_MASTER WHERE license_number = @license_number';
    const request = pool.request().input('license_number', sql.VarChar(50), licenseNumber);

    if (excludeDriverId) {
      query += ' AND driver_id != @excludeDriverId';
      request.input('excludeDriverId', sql.Int, excludeDriverId);
    }

    const result = await request.query(query);
    return result.recordset.length > 0;
  }

  async mobileNumberExists(mobileNumber: string, excludeDriverId?: number): Promise<boolean> {
    const pool = await this.getPool();
    let query = 'SELECT 1 FROM dbo.DRIVER_MASTER WHERE mobile_number = @mobile_number';
    const request = pool.request().input('mobile_number', sql.VarChar(15), mobileNumber);

    if (excludeDriverId) {
      query += ' AND driver_id != @excludeDriverId';
      request.input('excludeDriverId', sql.Int, excludeDriverId);
    }

    const result = await request.query(query);
    return result.recordset.length > 0;
  }
}
