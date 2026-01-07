import sql from 'mssql';

export const dbConfig: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'jqgiF@12345Z',
  server: process.env.DB_SERVER || '103.197.76.251',
  database: process.env.DB_NAME || 'Cylinder-Management',
  
  options: {
    encrypt: false, // Set to true if using Azure
    trustServerCertificate: true, // Set to true for local development
    enableArithAbort: true,
  },
  port: 1433, // Default SQL Server port
};

export const connectDB = async (): Promise<sql.ConnectionPool> => {
  try {
    const pool = await sql.connect(dbConfig);
    console.log('Database connected successfully');
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

export default sql;
