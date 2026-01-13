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
      SELECT LocationId, LocationName, LocationType, CustomerId, Address, City, State, IsActive, CreatedAt
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
        SELECT LocationId, LocationName, LocationType, CustomerId, Address, City, State, IsActive, CreatedAt
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
      .input('CustomerId', sql.Int, data.CustomerId ?? null)
      .input('Address', sql.VarChar(255), data.Address ?? null)
      .input('City', sql.VarChar(50), data.City ?? null)
      .input('State', sql.VarChar(50), data.State ?? null)
      .input('IsActive', sql.Bit, data.IsActive ?? true)
      .query(`
        INSERT INTO dbo.LOCATION_MASTER (LocationName, LocationType, CustomerId, Address, City, State, IsActive)
        OUTPUT INSERTED.*
        VALUES (@LocationName, @LocationType, @CustomerId, @Address, @City, @State, @IsActive)
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
    if (data.CustomerId !== undefined) {
      updates.push('CustomerId = @CustomerId');
      request.input('CustomerId', sql.Int, data.CustomerId);
    }
    if (data.Address !== undefined) {
      updates.push('Address = @Address');
      request.input('Address', sql.VarChar(255), data.Address);
    }
    if (data.City !== undefined) {
      updates.push('City = @City');
      request.input('City', sql.VarChar(50), data.City);
    }
    if (data.State !== undefined) {
      updates.push('State = @State');
      request.input('State', sql.VarChar(50), data.State);
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