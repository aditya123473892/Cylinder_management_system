import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { DealerMaster, CreateDealerRequest, UpdateDealerRequest } from '../types/dealer';

export class DealerRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<DealerMaster[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT DealerId, DealerName, DealerType, ParentDealerId, LocationId, IsActive, AadhaarImage, PanImage, CreatedAt, CreatedBy
      FROM dbo.DEALER_MASTER
      ORDER BY DealerId
    `);
    return result.recordset;
  }

  async findById(id: number): Promise<DealerMaster | null> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT DealerId, DealerName, DealerType, ParentDealerId, LocationId, IsActive, AadhaarImage, PanImage, CreatedAt, CreatedBy
        FROM dbo.DEALER_MASTER
        WHERE DealerId = @id
      `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async create(data: CreateDealerRequest): Promise<DealerMaster> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('DealerName', sql.NVarChar(200), data.DealerName)
      .input('DealerType', sql.NVarChar(20), data.DealerType)
      .input('ParentDealerId', sql.Int, data.ParentDealerId ?? null)
      .input('LocationId', sql.Int, data.LocationId)
      .input('AadhaarImage', sql.VarBinary(sql.MAX), data.AadhaarImage ?? null)
      .input('PanImage', sql.VarBinary(sql.MAX), data.PanImage ?? null)
      .input('IsActive', sql.Bit, data.IsActive ?? true)
      .input('CreatedBy', sql.Int, data.CreatedBy ?? null)
      .query(`
        INSERT INTO dbo.DEALER_MASTER (DealerName, DealerType, ParentDealerId, LocationId, AadhaarImage, PanImage, IsActive, CreatedBy)
        OUTPUT INSERTED.*
        VALUES (@DealerName, @DealerType, @ParentDealerId, @LocationId, @AadhaarImage, @PanImage, @IsActive, @CreatedBy)
      `);
    return result.recordset[0];
  }

  async update(id: number, data: UpdateDealerRequest): Promise<DealerMaster | null> {
    const pool = await this.getPool();
    let query = 'UPDATE dbo.DEALER_MASTER SET ';
    const updates: string[] = [];
    const request = pool.request().input('id', sql.Int, id);

    if (data.DealerName !== undefined) {
      updates.push('DealerName = @DealerName');
      request.input('DealerName', sql.NVarChar(200), data.DealerName);
    }
    if (data.DealerType !== undefined) {
      updates.push('DealerType = @DealerType');
      request.input('DealerType', sql.NVarChar(20), data.DealerType);
    }
    if (data.ParentDealerId !== undefined) {
      updates.push('ParentDealerId = @ParentDealerId');
      request.input('ParentDealerId', sql.Int, data.ParentDealerId);
    }
    if (data.LocationId !== undefined) {
      updates.push('LocationId = @LocationId');
      request.input('LocationId', sql.Int, data.LocationId);
    }
    if (data.AadhaarImage !== undefined) {
      updates.push('AadhaarImage = @AadhaarImage');
      request.input('AadhaarImage', sql.VarBinary(sql.MAX), data.AadhaarImage);
    }
    if (data.PanImage !== undefined) {
      updates.push('PanImage = @PanImage');
      request.input('PanImage', sql.VarBinary(sql.MAX), data.PanImage);
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

    query += updates.join(', ') + ' OUTPUT INSERTED.* WHERE DealerId = @id';

    const result = await request.query(query);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async delete(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.DEALER_MASTER WHERE DealerId = @id');
    return result.rowsAffected[0] > 0;
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT 1 FROM dbo.DEALER_MASTER WHERE DealerId = @id');
    return result.recordset.length > 0;
  }
}
