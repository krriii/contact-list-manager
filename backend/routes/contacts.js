const express = require('express');
const router = express.Router();
const { getAllContacts, addContact, updateContact, deleteContact } = require('../db');

// Get all contacts
router.get('/', async (req, res) => {
  try {
    const contacts = await getAllContacts();
    if (!contacts) {
      return res.status(404).json({ message: 'No contacts found' });
    }
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Server error while fetching contacts' });
  }
});

// Get a single contact by ID
router.get('/:id', async (req, res) => {
  try {
    const contacts = await getAllContacts();
    if (!contacts) {
      return res.status(404).json({ message: 'No contacts found' });
    }
    
    const contact = contacts.find(c => c.id === req.params.id);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    res.json(contact);
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
    
    const newContact = await addContact({ name, email, phone });
    if (!newContact) {
      return res.status(500).json({ message: 'Failed to create contact' });
    }
    
    res.status(201).json(newContact);
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
    
    const updatedContact = await updateContact(contactId, { name, email, phone });
    if (!updatedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    res.json(updatedContact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ message: 'Server error while updating contact' });
  }
});

// Delete a contact
router.delete('/:id', async (req, res) => {
  try {
    const contactId = req.params.id;
    const result = await deleteContact(contactId);
    
    if (!result) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    res.status(200).json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: 'Server error while deleting contact' });
  }
});

module.exports = router;