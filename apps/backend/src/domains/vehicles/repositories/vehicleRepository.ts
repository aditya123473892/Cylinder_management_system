import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { VehicleMaster, CreateVehicleRequest, UpdateVehicleRequest } from '../types/vehicle';

export class VehicleRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<VehicleMaster[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT vehicle_id, vehicle_number, vehicle_type, capacity_tonnes, transporter_id, is_active, created_at
      FROM dbo.VEHICLE_MASTER
      ORDER BY vehicle_id
    `);
    return result.recordset;
  }

  async findById(id: number): Promise<VehicleMaster | null> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT vehicle_id, vehicle_number, vehicle_type, capacity_tonnes, transporter_id, is_active, created_at
        FROM dbo.VEHICLE_MASTER
        WHERE vehicle_id = @id
      `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async create(data: CreateVehicleRequest): Promise<VehicleMaster> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('vehicle_number', sql.VarChar(20), data.vehicle_number)
      .input('vehicle_type', sql.VarChar(50), data.vehicle_type)
      .input('capacity_tonnes', sql.Decimal(10, 2), data.capacity_tonnes)
      .input('transporter_id', sql.Int, data.transporter_id ?? null)
      .input('is_active', sql.Bit, true)
      .query(`
        INSERT INTO dbo.VEHICLE_MASTER (vehicle_number, vehicle_type, capacity_tonnes, transporter_id, is_active)
        OUTPUT INSERTED.*
        VALUES (@vehicle_number, @vehicle_type, @capacity_tonnes, @transporter_id, @is_active)
      `);
    return result.recordset[0];
  }

  async update(id: number, data: UpdateVehicleRequest): Promise<VehicleMaster | null> {
    const pool = await this.getPool();
    let query = 'UPDATE dbo.VEHICLE_MASTER SET ';
    const updates: string[] = [];
    const request = pool.request().input('id', sql.Int, id);

    if (data.vehicle_number !== undefined) {
      updates.push('vehicle_number = @vehicle_number');
      request.input('vehicle_number', sql.VarChar(20), data.vehicle_number);
    }
    if (data.vehicle_type !== undefined) {
      updates.push('vehicle_type = @vehicle_type');
      request.input('vehicle_type', sql.VarChar(50), data.vehicle_type);
    }
    if (data.capacity_tonnes !== undefined) {
      updates.push('capacity_tonnes = @capacity_tonnes');
      request.input('capacity_tonnes', sql.Decimal(10, 2), data.capacity_tonnes);
    }
    if (data.transporter_id !== undefined) {
      updates.push('transporter_id = @transporter_id');
      request.input('transporter_id', sql.Int, data.transporter_id);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = @is_active');
      request.input('is_active', sql.Bit, data.is_active);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    query += updates.join(', ') + ' OUTPUT INSERTED.* WHERE vehicle_id = @id';

    const result = await request.query(query);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async delete(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.VEHICLE_MASTER WHERE vehicle_id = @id');
    return result.rowsAffected[0] > 0;
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT 1 FROM dbo.VEHICLE_MASTER WHERE vehicle_id = @id');
    return result.recordset.length > 0;
  }

  async vehicleNumberExists(vehicleNumber: string, excludeVehicleId?: number): Promise<boolean> {
    const pool = await this.getPool();
    let query = 'SELECT 1 FROM dbo.VEHICLE_MASTER WHERE vehicle_number = @vehicle_number';
    const request = pool.request().input('vehicle_number', sql.VarChar(20), vehicleNumber);

    if (excludeVehicleId) {
      query += ' AND vehicle_id != @excludeVehicleId';
      request.input('excludeVehicleId', sql.Int, excludeVehicleId);
    }

    const result = await request.query(query);
    return result.recordset.length > 0;
  }
}
