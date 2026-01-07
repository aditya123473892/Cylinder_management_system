import express from 'express';
import cors from 'cors';
import { connectDB } from './shared/config/database';
import cylinderTypeRoutes from './domains/cylinder/routes/cylinderTypeRoutes';

const app = express();
const PORT = process.env.PORT || 8000;

// CORS middleware
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Initialize database connection
connectDB().then(async (pool) => {
  console.log('Database connection initialized');

  // Log database name
  try {
    const dbResult = await pool.request().query('SELECT DB_NAME() as database_name');
    console.log('Connected to database:', dbResult.recordset[0].database_name);
  } catch (error) {
    console.error('Error getting database name:', error);
  }
}).catch((error) => {
  console.error('Failed to initialize database connection:', error);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

app.get('/db-test', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT 1 as test');
    res.json({
      status: 'OK',
      message: 'Database connection successful',
      data: result.recordset
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cylinder type routes
app.use('/api/cylinder-types', cylinderTypeRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
