const db = require('./firebase-config');
const { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc } = require('firebase/firestore');

// Initialize database
async function initializeDatabase() {
  try {
    // Check if contacts collection exists by trying to get its documents
    const contactsRef = collection(db, 'contacts');
    await getDocs(contactsRef);
    console.log('Connected to Firebase Firestore');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Get all contacts
async function getAllContacts() {
  try {
    const contactsRef = collection(db, 'contacts');
    const querySnapshot = await getDocs(contactsRef);
    const contacts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return contacts;
  } catch (error) {
    console.error('Error getting contacts:', error);
    return null;
  }
}

// Add a new contact
async function addContact(contact) {
  try {
    const contactsRef = collection(db, 'contacts');
    const docRef = await addDoc(contactsRef, {
      ...contact,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Get the newly created document to return complete data
    const newDoc = await getDoc(docRef);
    if (!newDoc.exists()) {
      throw new Error('Failed to create contact');
    }
    
    return { id: docRef.id, ...newDoc.data() };
  } catch (error) {
    console.error('Error adding contact:', error);
    return null;
  }
}

// Update a contact
async function updateContact(id, contact) {
  try {
    const contactRef = doc(db, 'contacts', id);
    
    // Check if document exists
    const docSnap = await getDoc(contactRef);
    if (!docSnap.exists()) {
      return null;
    }
    
    await updateDoc(contactRef, {
      ...contact,
      updated_at: new Date()
    });
    
    // Get the updated document
    const updatedDoc = await getDoc(contactRef);
    return { id, ...updatedDoc.data() };
  } catch (error) {
    console.error('Error updating contact:', error);
    return null;
  }
}

// Delete a contact
async function deleteContact(id) {
  try {
    const contactRef = doc(db, 'contacts', id);
    
    // Check if document exists
    const docSnap = await getDoc(contactRef);
    if (!docSnap.exists()) {
      return null;
    }
    
    await deleteDoc(contactRef);
    return true;
  } catch (error) {
    console.error('Error deleting contact:', error);
    return null;
  }
}

// Search contacts
async function searchContacts(searchTerm) {
  try {
    const contactsRef = collection(db, 'contacts');
    const q = query(
      contactsRef,
      where('name', '>=', searchTerm),
      where('name', '<=', searchTerm + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error searching contacts:', error);
    return null;
  }
}

module.exports = {
  initializeDatabase,
  getAllContacts,
  addContact,
  updateContact,
  deleteContact,
  searchContacts
};