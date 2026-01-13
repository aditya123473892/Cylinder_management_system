import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { CustomerMaster, CreateCustomerRequest, UpdateCustomerRequest } from '../types/customer';

export class CustomerRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<CustomerMaster[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT CustomerId, CustomerName, CustomerType, ParentCustomerId, LocationId, RetentionDays, IsActive, CreatedAt, CreatedBy
      FROM dbo.CUSTOMER_MASTER
      ORDER BY CustomerId
    `);
    return result.recordset;
  }

  async findById(id: number): Promise<CustomerMaster | null> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT CustomerId, CustomerName, CustomerType, ParentCustomerId, LocationId, RetentionDays, IsActive, CreatedAt, CreatedBy
        FROM dbo.CUSTOMER_MASTER
        WHERE CustomerId = @id
      `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async create(data: CreateCustomerRequest): Promise<CustomerMaster> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('CustomerName', sql.NVarChar(200), data.CustomerName)
      .input('CustomerType', sql.NVarChar(20), data.CustomerType)
      .input('ParentCustomerId', sql.Int, data.ParentCustomerId ?? null)
      .input('LocationId', sql.Int, data.LocationId)
      .input('RetentionDays', sql.Int, data.RetentionDays)
      .input('IsActive', sql.Bit, data.IsActive ?? true)
      .input('CreatedBy', sql.Int, data.CreatedBy ?? null)
      .query(`
        INSERT INTO dbo.CUSTOMER_MASTER (CustomerName, CustomerType, ParentCustomerId, LocationId, RetentionDays, IsActive, CreatedBy)
        OUTPUT INSERTED.*
        VALUES (@CustomerName, @CustomerType, @ParentCustomerId, @LocationId, @RetentionDays, @IsActive, @CreatedBy)
      `);
    return result.recordset[0];
  }

  async update(id: number, data: UpdateCustomerRequest): Promise<CustomerMaster | null> {
    const pool = await this.getPool();
    let query = 'UPDATE dbo.CUSTOMER_MASTER SET ';
    const updates: string[] = [];
    const request = pool.request().input('id', sql.Int, id);

    if (data.CustomerName !== undefined) {
      updates.push('CustomerName = @CustomerName');
      request.input('CustomerName', sql.NVarChar(200), data.CustomerName);
    }
    if (data.CustomerType !== undefined) {
      updates.push('CustomerType = @CustomerType');
      request.input('CustomerType', sql.NVarChar(20), data.CustomerType);
    }
    if (data.ParentCustomerId !== undefined) {
      updates.push('ParentCustomerId = @ParentCustomerId');
      request.input('ParentCustomerId', sql.Int, data.ParentCustomerId);
    }
    if (data.LocationId !== undefined) {
      updates.push('LocationId = @LocationId');
      request.input('LocationId', sql.Int, data.LocationId);
    }
    if (data.RetentionDays !== undefined) {
      updates.push('RetentionDays = @RetentionDays');
      request.input('RetentionDays', sql.Int, data.RetentionDays);
    }
    if (data.IsActive !== undefined) {
      updates.push('IsActive = @IsActive');
      request.input('IsActive', sql.Bit, data.IsActive);
    }
    if (data.CreatedBy !== undefined) {
      updates.push('CreatedBy = @CreatedBy');
      request.input('CreatedBy', sql.Int, data.CreatedBy);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    query += updates.join(', ') + ' OUTPUT INSERTED.* WHERE CustomerId = @id';

    const result = await request.query(query);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async delete(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.CUSTOMER_MASTER WHERE CustomerId = @id');
    return result.rowsAffected[0] > 0;
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT 1 FROM dbo.CUSTOMER_MASTER WHERE CustomerId = @id');
    return result.recordset.length > 0;
  }
}
