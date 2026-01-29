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

async function debugDrivers() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(dbConfig);
    console.log('Connected successfully');

    // Check if DRIVER_MASTER table exists
    const tableCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'DRIVER_MASTER'
    `);
    
    console.log('Table exists check:', tableCheck.recordset);

    // Get all drivers
    const driversResult = await pool.request().query(`
      SELECT driver_id, driver_name, mobile_number, is_active 
      FROM DRIVER_MASTER 
      ORDER BY driver_id
    `);

    console.log('\n=== ALL DRIVERS IN DATABASE ===');
    console.log(`Total count: ${driversResult.recordset.length}`);
    
    if (driversResult.recordset.length === 0) {
      console.log('❌ No drivers found in the database!');
      console.log('\n🔧 SOLUTION: You need to add drivers to the DRIVER_MASTER table first.');
      console.log('You can use the POST /api/drivers endpoint to create drivers.');
    } else {
      console.log('✅ Drivers found:');
      driversResult.recordset.forEach(driver => {
        console.log(`  ID: ${driver.driver_id}, Name: ${driver.driver_name}, Mobile: ${driver.mobile_number}, Active: ${driver.is_active}`);
      });
    }

    // Check for any specific driver ID that might be causing issues
    console.log('\n=== RECENT DRIVER IDs ===');
    const recentIds = await pool.request().query(`
      SELECT TOP 5 driver_id, driver_name, created_at 
      FROM DRIVER_MASTER 
      ORDER BY created_at DESC
    `);
    
    recentIds.recordset.forEach(driver => {
      console.log(`  ID: ${driver.driver_id}, Name: ${driver.driver_name}, Created: ${driver.created_at}`);
    });

  } catch (error) {
    console.error('❌ Database error:', error);
    console.log('\n🔧 POSSIBLE SOLUTIONS:');
    console.log('1. Check database connection credentials');
    console.log('2. Verify the DRIVER_MASTER table exists');
    console.log('3. Ensure the database server is accessible');
  } finally {
    await sql.close();
    console.log('\nConnection closed');
  }
}

debugDrivers();
