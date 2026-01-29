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
      SELECT CustomerId, CustomerName, ParentDealerId, Location, IsActive, AadhaarImage, PanImage, GSTNumber, StateCode, BillingAddress, CreatedAt, CreatedBy
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
        SELECT CustomerId, CustomerName, ParentDealerId, Location, IsActive, AadhaarImage, PanImage, GSTNumber, StateCode, BillingAddress, CreatedAt, CreatedBy
        FROM dbo.CUSTOMER_MASTER
        WHERE CustomerId = @id
      `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async create(data: CreateCustomerRequest): Promise<CustomerMaster> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('CustomerName', sql.NVarChar(200), data.CustomerName)
      .input('ParentDealerId', sql.Int, data.ParentDealerId ?? null)
      .input('Location', sql.NVarChar(200), data.Location)
      .input('AadhaarImage', sql.VarBinary(sql.MAX), data.AadhaarImage ?? null)
      .input('PanImage', sql.VarBinary(sql.MAX), data.PanImage ?? null)
      .input('GSTNumber', sql.VarChar(15), data.GSTNumber ?? null)
      .input('StateCode', sql.VarChar(2), data.StateCode ?? null)
      .input('BillingAddress', sql.VarChar(500), data.BillingAddress ?? null)
      .input('IsActive', sql.Bit, data.IsActive ?? true)
      .input('CreatedBy', sql.Int, data.CreatedBy ?? null)
      .query(`
        INSERT INTO dbo.CUSTOMER_MASTER (CustomerName, ParentDealerId, Location, AadhaarImage, PanImage, GSTNumber, StateCode, BillingAddress, IsActive, CreatedBy)
        OUTPUT INSERTED.*
        VALUES (@CustomerName, @ParentDealerId, @Location, @AadhaarImage, @PanImage, @GSTNumber, @StateCode, @BillingAddress, @IsActive, @CreatedBy)
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
    if (data.ParentDealerId !== undefined) {
      updates.push('ParentDealerId = @ParentDealerId');
      request.input('ParentDealerId', sql.Int, data.ParentDealerId);
    }
    if (data.Location !== undefined) {
      updates.push('Location = @Location');
      request.input('Location', sql.NVarChar(200), data.Location);
    }
    if (data.AadhaarImage !== undefined) {
      updates.push('AadhaarImage = @AadhaarImage');
      request.input('AadhaarImage', sql.VarBinary(sql.MAX), data.AadhaarImage);
    }
    if (data.PanImage !== undefined) {
      updates.push('PanImage = @PanImage');
      request.input('PanImage', sql.VarBinary(sql.MAX), data.PanImage);
    }
    if (data.GSTNumber !== undefined) {
      updates.push('GSTNumber = @GSTNumber');
      request.input('GSTNumber', sql.VarChar(15), data.GSTNumber);
    }
    if (data.StateCode !== undefined) {
      updates.push('StateCode = @StateCode');
      request.input('StateCode', sql.VarChar(2), data.StateCode);
    }
    if (data.BillingAddress !== undefined) {
      updates.push('BillingAddress = @BillingAddress');
      request.input('BillingAddress', sql.VarChar(500), data.BillingAddress);
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
