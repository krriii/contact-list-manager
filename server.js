const express = require('express');
const cors = require('cors');
const path = require('path');
const contactsRoutes = require('./backend/routes/contacts');
const { initializeDatabase } = require('./backend/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize the database connection and tables
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// API Routes
app.use('/api/contacts', contactsRoutes);

// For any other route, serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// For Vercel serverless functions
module.exports = app;