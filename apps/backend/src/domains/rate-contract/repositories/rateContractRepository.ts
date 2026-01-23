import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { RateContractMaster, CreateRateContractRequest, UpdateRateContractRequest, RateContractDetail } from '../types/rateContract';

export class RateContractRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<RateContractMaster[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT
        rc.rate_contract_id,
        rc.contract_name,
        rc.customer_id,
        rc.dealer_id,
        c.CustomerName as customer_name,
        d.DealerName as dealer_name,
        rc.valid_from,
        rc.valid_to,
        rc.is_active,
        rc.created_at
      FROM dbo.RATE_CONTRACT_MASTER rc
      LEFT JOIN dbo.CUSTOMER_MASTER c ON rc.customer_id = c.CustomerId
      LEFT JOIN dbo.DEALER_MASTER d ON rc.dealer_id = d.DealerId
      ORDER BY rc.rate_contract_id
    `);

    const contracts = result.recordset;

    // Get rates for each contract
    for (const contract of contracts) {
      contract.rates = await this.getContractRates(contract.rate_contract_id);
    }

    return contracts;
  }

  async findById(id: number): Promise<RateContractMaster | null> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          rc.rate_contract_id,
          rc.contract_name,
          rc.customer_id,
          rc.dealer_id,
          c.CustomerName as customer_name,
          d.DealerName as dealer_name,
          rc.valid_from,
          rc.valid_to,
          rc.is_active,
          rc.created_at
        FROM dbo.RATE_CONTRACT_MASTER rc
        LEFT JOIN dbo.CUSTOMER_MASTER c ON rc.customer_id = c.CustomerId
        LEFT JOIN dbo.DEALER_MASTER d ON rc.dealer_id = d.DealerId
        WHERE rc.rate_contract_id = @id
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const contract = result.recordset[0];
    contract.rates = await this.getContractRates(id);
    return contract;
  }

  async findActiveContracts(customerId?: number, dealerId?: number, effectiveDate?: string): Promise<RateContractMaster[]> {
    const pool = await this.getPool();
    let query = `
      SELECT
        rc.rate_contract_id,
        rc.contract_name,
        rc.customer_id,
        rc.dealer_id,
        c.CustomerName as customer_name,
        d.DealerName as dealer_name,
        rc.valid_from,
        rc.valid_to,
        rc.is_active,
        rc.created_at
      FROM dbo.RATE_CONTRACT_MASTER rc
      LEFT JOIN dbo.CUSTOMER_MASTER c ON rc.customer_id = c.CustomerId
      LEFT JOIN dbo.DEALER_MASTER d ON rc.dealer_id = d.DealerId
      WHERE rc.is_active = 1
    `;

    const request = pool.request();

    if (effectiveDate) {
      query += ' AND @effectiveDate BETWEEN rc.valid_from AND rc.valid_to';
      request.input('effectiveDate', sql.Date, new Date(effectiveDate));
    }

    if (customerId) {
      query += ' AND rc.customer_id = @customerId';
      request.input('customerId', sql.Int, customerId);
    }

    if (dealerId) {
      query += ' AND rc.dealer_id = @dealerId';
      request.input('dealerId', sql.Int, dealerId);
    }

    query += ' ORDER BY rc.rate_contract_id';

    const result = await request.query(query);
    const contracts = result.recordset;

    // Get rates for each contract
    for (const contract of contracts) {
      contract.rates = await this.getContractRates(contract.rate_contract_id);
    }

    return contracts;
  }

  async findActiveContractForCylinder(customerId?: number, dealerId?: number, cylinderTypeId?: number, effectiveDate?: string): Promise<RateContractDetail | null> {
    const contracts = await this.findActiveContracts(customerId, dealerId, effectiveDate);

    for (const contract of contracts) {
      const rate = contract.rates.find(r => r.cylinder_type_id === cylinderTypeId);
      if (rate) {
        return rate;
      }
    }

    return null;
  }

  private async getContractRates(contractId: number): Promise<RateContractDetail[]> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('contractId', sql.Int, contractId)
      .query(`
        SELECT cylinder_type_id, rate_per_cylinder
        FROM dbo.RATE_CONTRACT_DETAILS
        WHERE rate_contract_id = @contractId
        ORDER BY cylinder_type_id
      `);
    return result.recordset;
  }

  async create(data: CreateRateContractRequest): Promise<RateContractMaster> {
    const pool = await this.getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Insert main contract - temporarily set old columns to default values for backward compatibility
      const contractResult = await transaction.request()
        .input('contract_name', sql.VarChar(100), data.contract_name)
        .input('customer_type', sql.VarChar(20), 'DIRECT') // Temporary default value
        .input('cylinder_type_id', sql.Int, data.rates[0]?.cylinder_type_id || 1) // Use first cylinder type as default
        .input('rate_per_cylinder', sql.Decimal(10, 2), data.rates[0]?.rate_per_cylinder || 0) // Use first rate as default
        .input('customer_id', sql.Int, data.customer_id || null)
        .input('dealer_id', sql.Int, data.dealer_id || null)
        .input('valid_from', sql.Date, new Date(data.valid_from))
        .input('valid_to', sql.Date, new Date(data.valid_to))
        .input('is_active', sql.Bit, true)
        .query(`
          INSERT INTO dbo.RATE_CONTRACT_MASTER (
            contract_name, customer_type, cylinder_type_id, rate_per_cylinder,
            customer_id, dealer_id, valid_from, valid_to, is_active
          )
          OUTPUT INSERTED.*
          VALUES (@contract_name, @customer_type, @cylinder_type_id, @rate_per_cylinder,
                  @customer_id, @dealer_id, @valid_from, @valid_to, @is_active)
        `);

      const contractId = contractResult.recordset[0].rate_contract_id;

      // Insert rates
      for (const rate of data.rates) {
        await transaction.request()
          .input('contractId', sql.Int, contractId)
          .input('cylinderTypeId', sql.Int, rate.cylinder_type_id)
          .input('ratePerCylinder', sql.Decimal(10, 2), rate.rate_per_cylinder)
          .query(`
            INSERT INTO dbo.RATE_CONTRACT_DETAILS (
              rate_contract_id, cylinder_type_id, rate_per_cylinder
            )
            VALUES (@contractId, @cylinderTypeId, @ratePerCylinder)
          `);
      }

      await transaction.commit();

      // Return complete contract
      return await this.findById(contractId) as RateContractMaster;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(id: number, data: UpdateRateContractRequest): Promise<RateContractMaster | null> {
    const pool = await this.getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Update main contract
      let query = 'UPDATE dbo.RATE_CONTRACT_MASTER SET ';
      const updates: string[] = [];
      const request = transaction.request().input('id', sql.Int, id);

      if (data.contract_name !== undefined) {
        updates.push('contract_name = @contract_name');
        request.input('contract_name', sql.VarChar(100), data.contract_name);
      }
      if (data.customer_id !== undefined) {
        updates.push('customer_id = @customer_id');
        request.input('customer_id', sql.Int, data.customer_id || null);
      }
      if (data.dealer_id !== undefined) {
        updates.push('dealer_id = @dealer_id');
        request.input('dealer_id', sql.Int, data.dealer_id || null);
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

      if (updates.length > 0) {
        query += updates.join(', ') + ' WHERE rate_contract_id = @id';
        await request.query(query);
      }

      // Update rates if provided
      if (data.rates !== undefined) {
        // Delete existing rates
        await transaction.request()
          .input('contractId', sql.Int, id)
          .query('DELETE FROM dbo.RATE_CONTRACT_DETAILS WHERE rate_contract_id = @contractId');

        // Insert new rates
        for (const rate of data.rates) {
          await transaction.request()
            .input('contractId', sql.Int, id)
            .input('cylinderTypeId', sql.Int, rate.cylinder_type_id)
            .input('ratePerCylinder', sql.Decimal(10, 2), rate.rate_per_cylinder)
            .query(`
              INSERT INTO dbo.RATE_CONTRACT_DETAILS (
                rate_contract_id, cylinder_type_id, rate_per_cylinder
              )
              VALUES (@contractId, @cylinderTypeId, @ratePerCylinder)
            `);
        }
      }

      await transaction.commit();

      // Return updated contract
      return await this.findById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Delete rates first
      await transaction.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM dbo.RATE_CONTRACT_DETAILS WHERE rate_contract_id = @id');

      // Delete contract
      const result = await transaction.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM dbo.RATE_CONTRACT_MASTER WHERE rate_contract_id = @id');

      await transaction.commit();
      return result.rowsAffected[0] > 0;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT 1 FROM dbo.RATE_CONTRACT_MASTER WHERE rate_contract_id = @id');
    return result.recordset.length > 0;
  }
}
