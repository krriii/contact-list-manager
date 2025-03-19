const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');

// Get all contacts
router.get('/', async (req, res) => {
  try {
    const connection = getConnection();
    const [rows] = await connection.query('SELECT * FROM contacts ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Server error while fetching contacts' });
  }
});

// Get a single contact by ID
router.get('/:id', async (req, res) => {
  try {
    const connection = getConnection();
    const [rows] = await connection.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ message: 'Server error while fetching contact' });
  }
});

// Create a new contact
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    // Basic validation
    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email, and phone are required' });
    }
    
    const connection = getConnection();
    const [result] = await connection.query(
      'INSERT INTO contacts (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone]
    );
    
    const newContactId = result.insertId;
    const [newContact] = await connection.query('SELECT * FROM contacts WHERE id = ?', [newContactId]);
    
    res.status(201).json(newContact[0]);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ message: 'Server error while creating contact' });
  }
});

// Update an existing contact
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const contactId = req.params.id;
    
    // Basic validation
    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email, and phone are required' });
    }
    
    const connection = getConnection();
    
    // Check if contact exists
    const [existing] = await connection.query('SELECT * FROM contacts WHERE id = ?', [contactId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    // Update the contact
    await connection.query(
      'UPDATE contacts SET name = ?, email = ?, phone = ? WHERE id = ?',
      [name, email, phone, contactId]
    );
    
    // Get the updated contact
    const [updated] = await connection.query('SELECT * FROM contacts WHERE id = ?', [contactId]);
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ message: 'Server error while updating contact' });
  }
});

// Delete a contact
router.delete('/:id', async (req, res) => {
  try {
    const contactId = req.params.id;
    const connection = getConnection();
    
    // Check if contact exists
    const [existing] = await connection.query('SELECT * FROM contacts WHERE id = ?', [contactId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    // Delete the contact
    await connection.query('DELETE FROM contacts WHERE id = ?', [contactId]);
    
    res.status(200).json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: 'Server error while deleting contact' });
  }
});

module.exports = router;