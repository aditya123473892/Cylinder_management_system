const sql = require('mssql');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'jqgiF@12345ZPK',
  server: process.env.DB_SERVER || '103.197.76.251',
  database: process.env.DB_NAME || 'Cylinder-Management',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  port: 1433,
};

async function createSampleData() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(dbConfig);
    console.log('Connected successfully');

    // Check existing drivers
    const existingDrivers = await pool.request().query('SELECT COUNT(*) as count FROM DRIVER_MASTER');
    console.log(`Existing drivers: ${existingDrivers.recordset[0].count}`);

    // Check existing vehicles
    const existingVehicles = await pool.request().query('SELECT COUNT(*) as count FROM VEHICLE_MASTER');
    console.log(`Existing vehicles: ${existingVehicles.recordset[0].count}`);

    // Add sample drivers if none exist
    if (existingDrivers.recordset[0].count === 0) {
      console.log('Adding sample drivers...');
      
      await pool.request()
        .input('name1', sql.VarChar(100), 'Rajesh Kumar')
        .input('mobile1', sql.VarChar(15), '9876543210')
        .input('license1', sql.VarChar(50), 'DL1234567890123')
        .input('expiry1', sql.Date, new Date('2025-12-31'))
        .input('name2', sql.VarChar(100), 'Amit Singh')
        .input('mobile2', sql.VarChar(15), '9876543211')
        .input('license2', sql.VarChar(50), 'DL9876543210987')
        .input('expiry2', sql.Date, new Date('2025-06-30'))
        .query(`
          INSERT INTO DRIVER_MASTER (driver_name, mobile_number, license_number, license_expiry_date, is_active, CreatedBy)
          VALUES 
            (@name1, @mobile1, @license1, @expiry1, 1, 1),
            (@name2, @mobile2, @license2, @expiry2, 1, 1)
        `);
      
      console.log('✅ Added 2 sample drivers');
    }

    // Add sample vehicles if none exist
    if (existingVehicles.recordset[0].count === 0) {
      console.log('Adding sample vehicles...');
      
      await pool.request()
        .input('number1', sql.VarChar(20), 'MH01AB1234')
        .input('type1', sql.VarChar(50), 'Truck')
        .input('capacity1', sql.Decimal(5,2), 5.5)
        .input('number2', sql.VarChar(20), 'MH02CD5678')
        .input('type2', sql.VarChar(50), 'Mini Truck')
        .input('capacity2', sql.Decimal(5,2), 3.0)
        .query(`
          INSERT INTO VEHICLE_MASTER (vehicle_number, vehicle_type, capacity_tonnes, is_active, CreatedBy)
          VALUES 
            (@number1, @type1, @capacity1, 1, 1),
            (@number2, @type2, @capacity2, 1, 1)
        `);
      
      console.log('✅ Added 2 sample vehicles');
    }

    // Show current data
    console.log('\n=== CURRENT DRIVERS ===');
    const drivers = await pool.request().query(`
      SELECT driver_id, driver_name, mobile_number, is_active 
      FROM DRIVER_MASTER 
      ORDER BY driver_id
    `);
    
    drivers.recordset.forEach(driver => {
      console.log(`  ID: ${driver.driver_id}, Name: ${driver.driver_name}, Mobile: ${driver.mobile_number}, Active: ${driver.is_active}`);
    });

    console.log('\n=== CURRENT VEHICLES ===');
    const vehicles = await pool.request().query(`
      SELECT vehicle_id, vehicle_number, vehicle_type, capacity_tonnes, is_active 
      FROM VEHICLE_MASTER 
      ORDER BY vehicle_id
    `);
    
    vehicles.recordset.forEach(vehicle => {
      console.log(`  ID: ${vehicle.vehicle_id}, Number: ${vehicle.vehicle_number}, Type: ${vehicle.vehicle_type}, Capacity: ${vehicle.capacity_tonnes} tonnes, Active: ${vehicle.is_active}`);
    });

    console.log('\n✅ Sample data creation completed!');
    console.log('Now you can access the masters pages to add more drivers and vehicles.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.close();
  }
}

createSampleData();
