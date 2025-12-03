const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Asumsi Anda telah menyalin file ini dari Capstone-Backend (After)/src/utils/
const initializeUploadDirectories = require('./utils/initUploads'); 
const { errorHandler, notFound } = require('./utils/errorHandler');

const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const bapbRoutes = require('./routes/bapbRoutes');
const bappRoutes = require('./routes/bappRoutes');

const app = express();

initializeUploadDirectories();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files untuk serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'BAPB System API - Ready' });
});

// Serve static files (uploads)
app.use('/uploads', express.static('uploads'));

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'BA Digital System API - BAPB & BAPP Unified',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      bapb: '/api/bapb',
      bapp: '/api/bapp'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bapb', bapbRoutes);
app.use('/api/bapp', bappRoutes);

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler (Not Found)
app.use(notFound); 

// Global Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// Sync database and start server
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synced successfully');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Unable to connect to database:', err);
    process.exit(1);
  });

module.exports = app;