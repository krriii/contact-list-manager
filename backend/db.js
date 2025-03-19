const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',         // Replace with your MySQL username
  password: 'Krisha1128@',         // Replace with your MySQL password
  database: 'contacts_db'
};

// Create the connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database and create tables if they don't exist
async function initializeDatabase() {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    console.log('Connected to MySQL database');
    
    // Create contacts table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Contacts table initialized');
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Get database connection
function getConnection() {
  return pool;
}

module.exports = {
  initializeDatabase,
  getConnection
};