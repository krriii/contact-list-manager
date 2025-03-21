// IndexedDB setup
const DB_NAME = 'contact-list-manager';
const DB_VERSION = 1;

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('contacts')) {
                db.createObjectStore('contacts', { keyPath: 'id' });
            }
        };
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // PWA Installation handling
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    // Add install button if not already installed
    const installButton = document.createElement('button');
    installButton.className = 'fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 hidden';
    installButton.textContent = 'Install App';
    document.body.appendChild(installButton);

    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installButton.classList.add('hidden');
        }
    });

    // DOM Elements
    const contactForm = document.getElementById('contactForm');
    const contactsList = document.getElementById('contactsList');
    const searchInput = document.getElementById('searchInput');
    const formTitle = document.getElementById('formTitle');
    const cancelBtn = document.getElementById('cancelBtn');
    const connectionStatus = document.getElementById('connection-status');
    
    // Form inputs
    const contactIdInput = document.getElementById('contactId');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    
    // API URL - now relative to the current domain
    const API_URL = '/api/contacts';
    
    // Offline queue for pending operations
    let offlineQueue = [];
    
    // Load all contacts when page loads
    loadContacts();
    
    // Event Listeners
    contactForm.addEventListener('submit', saveContact);
    searchInput.addEventListener('input', searchContacts);
    cancelBtn.addEventListener('click', resetForm);
    
    // Online/Offline event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Functions
    
    // Handle online status
    function handleOnline() {
        connectionStatus.textContent = 'You are online';
        connectionStatus.classList.remove('hidden', 'bg-red-500', 'text-white');
        connectionStatus.classList.add('bg-green-500', 'text-white');
        
        // Process offline queue
        processOfflineQueue();
    }
    
    // Handle offline status
    function handleOffline() {
        connectionStatus.textContent = 'You are offline';
        connectionStatus.classList.remove('hidden', 'bg-green-500', 'text-white');
        connectionStatus.classList.add('bg-red-500', 'text-white');
    }
    
    // Process offline queue when back online
    async function processOfflineQueue() {
        if (!navigator.onLine) {
            showNotification('Still offline. Changes will sync when online.', 'warning');
            return;
        }

        const db = await openDB();
        while (offlineQueue.length > 0) {
            const operation = offlineQueue[0]; // Look at first item without removing it
            try {
                const response = await performOperation(operation);
                if (response) {
                    offlineQueue.shift(); // Only remove if successful
                    
                    // Update IndexedDB with the new data from Firestore
                    if (operation.tempId) {
                        // Remove the temporary contact from IndexedDB
                        await db.delete('contacts', operation.tempId);
                        // Add the new contact with the Firestore ID
                        await db.put('contacts', { ...response });
                    }
                    
                    showNotification('Offline changes synced successfully!', 'success');
                } else {
                    throw new Error('No response from server');
                }
            } catch (error) {
                console.error('Error syncing offline operation:', error);
                showNotification('Error syncing offline changes. Will retry later.', 'error');
                break; // Stop processing queue on error
            }
        }
        
        // After processing queue, reload contacts from Firestore
        await loadContacts();
    }
    
    // Perform operation (create, update, delete)
    async function performOperation(operation) {
        const { method, url, data } = operation;
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : undefined
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error performing ${method} operation:`, error);
            throw error;
        }
    }
    
    // Fetch all contacts from API
    async function loadContacts() {
        try {
            console.log('Fetching contacts from API...');
            const response = await fetch(API_URL, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            console.log('API Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            
            const contacts = await response.json();
            console.log('Fetched contacts:', contacts);
            
            // Update IndexedDB with fresh data
            if (navigator.onLine) {
                try {
                    const db = await openDB();
                    const transaction = db.transaction('contacts', 'readwrite');
                    const store = transaction.objectStore('contacts');
                    
                    // Clear existing data
                    await store.clear();
                    
                    // Add new data
                    for (const contact of contacts) {
                        await store.put(contact);
                    }
                } catch (dbError) {
                    console.error('Error updating IndexedDB:', dbError);
                    // Continue even if IndexedDB update fails
                }
            }
            
            // Sort contacts by name
            contacts.sort((a, b) => a.name.localeCompare(b.name));
            console.log('Sorted contacts:', contacts);
            
            // Display contacts immediately
            displayContacts(contacts);
        } catch (error) {
            console.error('Error loading contacts:', error);
            if (!navigator.onLine) {
                showNotification('You are offline. Showing cached data.', 'warning');
                // Try to load from IndexedDB if offline
                loadFromIndexedDB();
            } else {
                contactsList.innerHTML = '<p class="text-red-500 text-center py-4">Error loading contacts. Please try again later.</p>';
            }
        }
    }
    
    // Load contacts from IndexedDB
    async function loadFromIndexedDB() {
        try {
            const db = await openDB();
            const transaction = db.transaction('contacts', 'readonly');
            const store = transaction.objectStore('contacts');
            
            // Get all contacts from IndexedDB
            const contacts = await store.getAll();
            
            if (contacts && contacts.length > 0) {
                contacts.sort((a, b) => a.name.localeCompare(b.name));
                displayContacts(contacts);
            } else {
                contactsList.innerHTML = '<p class="text-gray-500 text-center py-4">No contacts found.</p>';
            }
        } catch (error) {
            console.error('Error loading from IndexedDB:', error);
            contactsList.innerHTML = '<p class="text-red-500 text-center py-4">Error loading contacts. Please try again later.</p>';
        }
    }
    
    // Display contacts in the list
    function displayContacts(contacts) {
        if (!contacts || contacts.length === 0) {
            contactsList.innerHTML = '<p class="text-gray-500 text-center py-4">No contacts found.</p>';
            return;
        }
        
        contactsList.innerHTML = '';
        contacts.forEach(contact => {
            const contactCard = document.createElement('div');
            contactCard.className = 'bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300';
            contactCard.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="contact-info">
                        <h3 class="font-semibold text-lg text-gray-800">${contact.name}</h3>
                        <p class="text-gray-600 flex items-center mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            ${contact.email}
                        </p>
                        <p class="text-gray-600 flex items-center mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            ${contact.phone}
                        </p>
                    </div>
                    <div class="contact-actions flex space-x-2">
                        <button class="edit-btn p-2 text-gray-600 hover:text-blue-600 transition-colors duration-300" data-id="${contact.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button class="delete-btn p-2 text-gray-600 hover:text-red-600 transition-colors duration-300" data-id="${contact.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            contactsList.appendChild(contactCard);
            
            // Add event listeners for edit and delete buttons
            contactCard.querySelector('.edit-btn').addEventListener('click', () => editContact(contact));
            contactCard.querySelector('.delete-btn').addEventListener('click', () => deleteContact(contact.id));
        });
    }
    
    // Save a new contact or update existing one
    async function saveContact(e) {
        e.preventDefault();
        
        const contactData = {
            name: nameInput.value,
            email: emailInput.value,
            phone: phoneInput.value
        };
        
        const contactId = contactIdInput.value;
        const method = contactId ? 'PUT' : 'POST';
        const url = contactId ? `${API_URL}/${contactId}` : API_URL;

        // Add loading state
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        saveBtn.classList.add('opacity-75');
        
        try {
            // Try to save to Firestore with retries
            let retries = 3;
            let lastError = null;
            
            while (retries > 0) {
                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        },
                        body: JSON.stringify(contactData)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        
                        // Update IndexedDB with the new data
                        try {
                            const db = await openDB();
                            const transaction = db.transaction('contacts', 'readwrite');
                            const store = transaction.objectStore('contacts');
                            await store.put({ ...result });
                        } catch (dbError) {
                            console.error('Error updating IndexedDB:', dbError);
                        }

                        resetForm();
                        await loadContacts(); // Reload contacts to get the updated list
                        showNotification('Contact saved successfully!', 'success');
                        return;
                    }
                    
                    lastError = new Error(`Network response was not ok: ${response.status}`);
                    if (response.status === 503) {
                        retries--;
                        if (retries > 0) {
                            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                            continue;
                        }
                    }
                    throw lastError;
                } catch (error) {
                    lastError = error;
                    retries--;
                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                        continue;
                    }
                    throw error;
                }
            }
            
            throw lastError;
        } catch (error) {
            console.error('Error saving contact:', error);
            if (!navigator.onLine) {
                // If offline, save to IndexedDB and queue for sync
                try {
                    const db = await openDB();
                    const transaction = db.transaction('contacts', 'readwrite');
                    const store = transaction.objectStore('contacts');
                    const tempId = Date.now().toString();
                    await store.put({ ...contactData, id: tempId });
                    
                    offlineQueue.push({
                        method,
                        url,
                        data: contactData,
                        tempId
                    });
                    showNotification('You are offline. Changes will sync when online.', 'warning');
                    resetForm();
                    await loadFromIndexedDB();
                } catch (dbError) {
                    console.error('Error saving to IndexedDB:', dbError);
                    showNotification('Failed to save contact. Please try again.', 'error');
                }
            } else {
                showNotification(`Failed to save contact: ${error.message}`, 'error');
            }
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-75');
        }
    }
    
    // Delete a contact
    async function deleteContact(id) {
        if (confirm('Are you sure you want to delete this contact?')) {
            try {
                // Check if offline
                if (!navigator.onLine) {
                    offlineQueue.push({
                        method: 'DELETE',
                        url: `${API_URL}/${id}`
                    });
                    showNotification('You are offline. Changes will sync when online.', 'warning');
                    await loadFromIndexedDB();
                    return;
                }
                
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`);
                }

                // Remove from IndexedDB using proper transaction
                try {
                    const db = await openDB();
                    const transaction = db.transaction('contacts', 'readwrite');
                    const store = transaction.objectStore('contacts');
                    await store.delete(id);
                } catch (dbError) {
                    console.error('Error removing from IndexedDB:', dbError);
                    // Continue even if IndexedDB operation fails
                }

                // Update UI immediately
                const contactElement = document.querySelector(`[data-id="${id}"]`).closest('.bg-white');
                if (contactElement) {
                    contactElement.remove();
                }

                showNotification('Contact deleted successfully!', 'success');
            } catch (error) {
                console.error('Error deleting contact:', error);
                showNotification('Failed to delete contact. Please try again.', 'error');
            }
        }
    }
    
    // Edit a contact
    function editContact(contact) {
        // Populate form with contact data
        contactIdInput.value = contact.id;
        nameInput.value = contact.name;
        emailInput.value = contact.email;
        phoneInput.value = contact.phone;
        
        // Update form title and show cancel button
        formTitle.textContent = 'Edit Contact';
        cancelBtn.classList.remove('hidden');

        // Scroll to form on mobile devices
        if (window.innerWidth < 768) {
            const formSection = document.querySelector('.w-full.md\\:w-1\\/2.md\\:pl-6');
            if (formSection) {
                formSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }
    
    // Reset form to add new contact mode
    function resetForm() {
        contactForm.reset();
        contactIdInput.value = '';
        formTitle.textContent = 'Add New Contact';
        cancelBtn.classList.add('hidden');
    }
    
    // Search contacts
    function searchContacts() {
        const searchTerm = searchInput.value.toLowerCase();
        
        fetch(API_URL)
            .then(response => response.json())
            .then(contacts => {
                if (searchTerm.trim() === '') {
                    displayContacts(contacts);
                    return;
                }
                
                // Filter contacts based on search term
                const filteredContacts = contacts.filter(contact => 
                    contact.name.toLowerCase().includes(searchTerm) || 
                    contact.email.toLowerCase().includes(searchTerm)
                );
                
                displayContacts(filteredContacts);
            })
            .catch(error => {
                console.error('Error searching contacts:', error);
                showNotification('Error searching contacts.', 'error');
            });
    }

    // Show notification
    function showNotification(message, type) {
        // Check if notification container exists, if not create it
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.className = 'fixed bottom-4 right-4 z-50';
            document.body.appendChild(notificationContainer);
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `mb-2 p-4 rounded-lg shadow-lg transition-opacity duration-500 flex items-center ${
            type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`;
        
        // Add icon based on type
        const iconSvg = type === 'success' 
            ? '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
        
        notification.innerHTML = `${iconSvg}<span>${message}</span>`;
        notificationContainer.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('opacity-0');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    // Add responsive behavior
    function handleResponsiveness() {
        const contactsSection = document.querySelector('.flex');
        const formSection = document.querySelector('.w-full.md\\:w-1\\/2.md\\:pl-6');
        const listSection = document.querySelector('.w-full.md\\:w-1\\/2.md\\:pr-6');
        
        if (window.innerWidth < 768) {
            if (contactsSection) contactsSection.classList.replace('flex', 'block');
            if (formSection) {
                formSection.classList.replace('md:w-1/2', 'w-full');
                formSection.classList.replace('md:pl-6', 'pt-6');
            }
            if (listSection) {
                listSection.classList.replace('md:w-1/2', 'w-full');
                listSection.classList.replace('md:pr-6', 'pb-6');
            }
        } else {
            if (contactsSection && contactsSection.classList.contains('block')) {
                contactsSection.classList.replace('block', 'flex');
            }
            if (formSection) {
                formSection.classList.replace('w-full', 'md:w-1/2');
                formSection.classList.replace('pt-6', 'md:pl-6');
            }
            if (listSection) {
                listSection.classList.replace('w-full', 'md:w-1/2');
                listSection.classList.replace('pb-6', 'md:pr-6');
            }
        }
    }

    // Initialize responsiveness
    handleResponsiveness();
    window.addEventListener('resize', handleResponsiveness);
});