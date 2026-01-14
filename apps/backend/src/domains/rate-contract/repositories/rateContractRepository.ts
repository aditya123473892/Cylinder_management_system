import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { RateContractMaster, CreateRateContractRequest, UpdateRateContractRequest } from '../types/rateContract';

export class RateContractRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<RateContractMaster[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT rc.*, ct.Capacity as cylinder_type_name
      FROM dbo.RATE_CONTRACT_MASTER rc
      INNER JOIN dbo.CYLINDER_TYPE_MASTER ct ON rc.cylinder_type_id = ct.CylinderTypeId
      ORDER BY rc.rate_contract_id
    `);
    return result.recordset;
  }

  async findById(id: number): Promise<RateContractMaster | null> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT rc.*, ct.Capacity as cylinder_type_name
        FROM dbo.RATE_CONTRACT_MASTER rc
        INNER JOIN dbo.CYLINDER_TYPE_MASTER ct ON rc.cylinder_type_id = ct.CylinderTypeId
        WHERE rc.rate_contract_id = @id
      `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async findActiveContracts(customerType: string, cylinderTypeId: number, effectiveDate: string): Promise<RateContractMaster[]> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('customerType', sql.VarChar(20), customerType)
      .input('cylinderTypeId', sql.Int, cylinderTypeId)
      .input('effectiveDate', sql.Date, new Date(effectiveDate))
      .query(`
        SELECT rc.*, ct.Capacity as cylinder_type_name
        FROM dbo.RATE_CONTRACT_MASTER rc
        INNER JOIN dbo.CYLINDER_TYPE_MASTER ct ON rc.cylinder_type_id = ct.CylinderTypeId
        WHERE rc.is_active = 1
          AND rc.cylinder_type_id = @cylinderTypeId
          AND @effectiveDate BETWEEN rc.valid_from AND rc.valid_to
          AND (rc.customer_type = @customerType OR rc.customer_type = 'ALL')
        ORDER BY rc.rate_per_cylinder ASC
      `);
    return result.recordset;
  }

  async create(data: CreateRateContractRequest): Promise<RateContractMaster> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('contract_name', sql.VarChar(100), data.contract_name)
      .input('customer_type', sql.VarChar(20), data.customer_type)
      .input('cylinder_type_id', sql.Int, data.cylinder_type_id)
      .input('rate_per_cylinder', sql.Decimal(10, 2), data.rate_per_cylinder)
      .input('valid_from', sql.Date, new Date(data.valid_from))
      .input('valid_to', sql.Date, new Date(data.valid_to))
      .input('is_active', sql.Bit, true)
      .query(`
        INSERT INTO dbo.RATE_CONTRACT_MASTER (
          contract_name, customer_type, cylinder_type_id, rate_per_cylinder,
          valid_from, valid_to, is_active
        )
        OUTPUT INSERTED.*
        VALUES (@contract_name, @customer_type, @cylinder_type_id, @rate_per_cylinder,
                @valid_from, @valid_to, @is_active)
      `);
    return result.recordset[0];
  }

  async update(id: number, data: UpdateRateContractRequest): Promise<RateContractMaster | null> {
    const pool = await this.getPool();
    let query = 'UPDATE dbo.RATE_CONTRACT_MASTER SET ';
    const updates: string[] = [];
    const request = pool.request().input('id', sql.Int, id);

    if (data.contract_name !== undefined) {
      updates.push('contract_name = @contract_name');
      request.input('contract_name', sql.VarChar(100), data.contract_name);
    }
    if (data.customer_type !== undefined) {
      updates.push('customer_type = @customer_type');
      request.input('customer_type', sql.VarChar(20), data.customer_type);
    }
    if (data.cylinder_type_id !== undefined) {
      updates.push('cylinder_type_id = @cylinder_type_id');
      request.input('cylinder_type_id', sql.Int, data.cylinder_type_id);
    }
    if (data.rate_per_cylinder !== undefined) {
      updates.push('rate_per_cylinder = @rate_per_cylinder');
      request.input('rate_per_cylinder', sql.Decimal(10, 2), data.rate_per_cylinder);
    }
    if (data.valid_from !== undefined) {
      updates.push('valid_from = @valid_from');
      request.input('valid_from', sql.Date, new Date(data.valid_from));
    }
    if (data.valid_to !== undefined) {
      updates.push('valid_to = @valid_to');
      request.input('valid_to', sql.Date, new Date(data.valid_to));
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = @is_active');
      request.input('is_active', sql.Bit, data.is_active);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    query += updates.join(', ') + ' OUTPUT INSERTED.* WHERE rate_contract_id = @id';

    const result = await request.query(query);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async delete(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.RATE_CONTRACT_MASTER WHERE rate_contract_id = @id');
    return result.rowsAffected[0] > 0;
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT 1 FROM dbo.RATE_CONTRACT_MASTER WHERE rate_contract_id = @id');
    return result.recordset.length > 0;
  }
}
