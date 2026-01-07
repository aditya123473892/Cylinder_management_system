import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { CylinderTypeMaster, CreateCylinderTypeRequest, UpdateCylinderTypeRequest } from '../types/cylinderType';

export class CylinderTypeRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<CylinderTypeMaster[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT CylinderTypeId, Capacity, IsActive, HeightCM, ManufacturingDate
      FROM dbo.CYLINDER_TYPE_MASTER
      ORDER BY CylinderTypeId
    `);
    return result.recordset;
  }

  async findById(id: number): Promise<CylinderTypeMaster | null> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT CylinderTypeId, Capacity, IsActive, HeightCM, ManufacturingDate
        FROM dbo.CYLINDER_TYPE_MASTER
        WHERE CylinderTypeId = @id
      `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async create(data: CreateCylinderTypeRequest): Promise<CylinderTypeMaster> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('Capacity', sql.VarChar(20), data.Capacity)
      .input('IsActive', sql.Bit, data.IsActive ?? true)
      .input('HeightCM', sql.Decimal(6, 2), data.HeightCM ?? null)
      .input('ManufacturingDate', sql.Date, data.ManufacturingDate ?? null)
      .query(`
        INSERT INTO dbo.CYLINDER_TYPE_MASTER (Capacity, IsActive, HeightCM, ManufacturingDate)
        OUTPUT INSERTED.*
        VALUES (@Capacity, @IsActive, @HeightCM, @ManufacturingDate)
      `);
    return result.recordset[0];
  }

  async update(id: number, data: UpdateCylinderTypeRequest): Promise<CylinderTypeMaster | null> {
    const pool = await this.getPool();
    let query = 'UPDATE dbo.CYLINDER_TYPE_MASTER SET ';
    const updates: string[] = [];
    const request = pool.request().input('id', sql.Int, id);

    if (data.Capacity !== undefined) {
      updates.push('Capacity = @Capacity');
      request.input('Capacity', sql.VarChar(20), data.Capacity);
    }
    if (data.IsActive !== undefined) {
      updates.push('IsActive = @IsActive');
      request.input('IsActive', sql.Bit, data.IsActive);
    }
    if (data.HeightCM !== undefined) {
      updates.push('HeightCM = @HeightCM');
      request.input('HeightCM', sql.Decimal(6, 2), data.HeightCM);
    }
    if (data.ManufacturingDate !== undefined) {
      updates.push('ManufacturingDate = @ManufacturingDate');
      request.input('ManufacturingDate', sql.Date, data.ManufacturingDate);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    query += updates.join(', ') + ' OUTPUT INSERTED.* WHERE CylinderTypeId = @id';

    const result = await request.query(query);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async delete(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.CYLINDER_TYPE_MASTER WHERE CylinderTypeId = @id');
    return result.rowsAffected[0] > 0;
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT 1 FROM dbo.CYLINDER_TYPE_MASTER WHERE CylinderTypeId = @id');
    return result.recordset.length > 0;
  }
}