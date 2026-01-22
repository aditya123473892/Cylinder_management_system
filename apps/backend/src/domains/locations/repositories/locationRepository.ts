import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { LocationMaster, CreateLocationRequest, UpdateLocationRequest } from '../types/location';

export class LocationRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<LocationMaster[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT LocationId, LocationName, LocationType, Address, Image, Latitude, Longitude, IsActive, CreatedAt
      FROM dbo.LOCATION_MASTER
      ORDER BY LocationId
    `);
    return result.recordset;
  }

  async findById(id: number): Promise<LocationMaster | null> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT LocationId, LocationName, LocationType, Address, Image, Latitude, Longitude, IsActive, CreatedAt
        FROM dbo.LOCATION_MASTER
        WHERE LocationId = @id
      `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async create(data: CreateLocationRequest): Promise<LocationMaster> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('LocationName', sql.VarChar(100), data.LocationName)
      .input('LocationType', sql.VarChar(30), data.LocationType)
      .input('Address', sql.VarChar(500), data.Address ?? null)
      .input('Image', sql.VarChar(255), data.Image ?? null)
      .input('Latitude', sql.Decimal(9, 6), data.Latitude ?? null)
      .input('Longitude', sql.Decimal(9, 6), data.Longitude ?? null)
      .input('IsActive', sql.Bit, data.IsActive ?? true)
      .query(`
        INSERT INTO dbo.LOCATION_MASTER (LocationName, LocationType, Address, Image, Latitude, Longitude, IsActive)
        OUTPUT INSERTED.*
        VALUES (@LocationName, @LocationType, @Address, @Image, @Latitude, @Longitude, @IsActive)
      `);
    return result.recordset[0];
  }

  async update(id: number, data: UpdateLocationRequest): Promise<LocationMaster | null> {
    const pool = await this.getPool();
    let query = 'UPDATE dbo.LOCATION_MASTER SET ';
    const updates: string[] = [];
    const request = pool.request().input('id', sql.Int, id);

    if (data.LocationName !== undefined) {
      updates.push('LocationName = @LocationName');
      request.input('LocationName', sql.VarChar(100), data.LocationName);
    }
    if (data.LocationType !== undefined) {
      updates.push('LocationType = @LocationType');
      request.input('LocationType', sql.VarChar(30), data.LocationType);
    }
    if (data.Address !== undefined) {
      updates.push('Address = @Address');
      request.input('Address', sql.VarChar(500), data.Address);
    }
    if (data.Image !== undefined) {
      updates.push('Image = @Image');
      request.input('Image', sql.VarChar(255), data.Image);
    }
    if (data.Latitude !== undefined) {
      updates.push('Latitude = @Latitude');
      request.input('Latitude', sql.Decimal(9, 6), data.Latitude);
    }
    if (data.Longitude !== undefined) {
      updates.push('Longitude = @Longitude');
      request.input('Longitude', sql.Decimal(9, 6), data.Longitude);
    }
    if (data.IsActive !== undefined) {
      updates.push('IsActive = @IsActive');
      request.input('IsActive', sql.Bit, data.IsActive);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    query += updates.join(', ') + ' OUTPUT INSERTED.* WHERE LocationId = @id';

    const result = await request.query(query);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async delete(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.LOCATION_MASTER WHERE LocationId = @id');
    return result.rowsAffected[0] > 0;
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT 1 FROM dbo.LOCATION_MASTER WHERE LocationId = @id');
    return result.recordset.length > 0;
  }
}
