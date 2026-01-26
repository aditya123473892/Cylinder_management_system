import express from 'express';
import cors from 'cors';
import { connectDB } from './shared/config/database';
import cylinderTypeRoutes from './domains/cylinder/routes/cylinderTypeRoutes';
import cylinderInventoryRoutes from './domains/cylinder/routes/cylinderInventoryRoutes';
import locationRoutes from './domains/locations/routes/locationRoutes';
import customerRoutes from './domains/customer/routes/customerRoutes';
import dealerRoutes from './domains/sub-dealer/routes/dealerRoutes';
import vehicleRoutes from './domains/vehicles/routes/vehicleRoutes';
import driverRoutes from './domains/drivers/routes/driverRoutes';
import rateContractRoutes from './domains/rate-contract/routes/rateContractRoutes';
import deliveryTransactionRoutes from './domains/delivery/routes/deliveryTransactionRoutes';
import deliveryOrderRoutes from './domains/delivery-orders/routes/deliveryOrderRoutes';
import cylinderExchangeRoutes from './domains/delivery-orders/routes/cylinderExchangeRoutes';
import grRoutes from './domains/gr/routes/grRoutes';
import authRoutes from './domains/auth-rbac/routes/authroutes';

const app = express();
const PORT = process.env.PORT || 8000;

// CORS middleware
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Cylinder type routes
app.use('/api/cylinder-types', cylinderTypeRoutes);

// Cylinder inventory routes
app.use('/api/cylinder-inventory', cylinderInventoryRoutes);

// Location routes
app.use('/api/locations', locationRoutes);

// Customer routes
app.use('/api/customers', customerRoutes);

// Dealer routes
app.use('/api/dealers', dealerRoutes);

// Vehicle routes
app.use('/api/vehicles', vehicleRoutes);

// Driver routes
app.use('/api/drivers', driverRoutes);

// Rate contract routes
app.use('/api/rate-contracts', rateContractRoutes);

// Delivery transaction routes
app.use('/api/delivery-transactions', deliveryTransactionRoutes);

// Delivery orders routes
app.use('/api/delivery-orders', deliveryOrderRoutes);

// Cylinder exchange routes
app.use('/api', cylinderExchangeRoutes);

// GR routes
app.use('/api/gr', grRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
