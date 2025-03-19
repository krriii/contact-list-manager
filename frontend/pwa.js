// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

// Handle PWA Installation
let deferredPrompt;
const installPrompt = document.getElementById('install-prompt');
const installButton = document.getElementById('install-button');
const dismissButton = document.getElementById('dismiss-button');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installPrompt.classList.remove('hidden');
});

installButton.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    console.log('User accepted the install prompt');
  } else {
    console.log('User dismissed the install prompt');
  }
  
  deferredPrompt = null;
  installPrompt.classList.add('hidden');
});

dismissButton.addEventListener('click', () => {
  installPrompt.classList.add('hidden');
});

// Handle offline/online status
const connectionStatus = document.getElementById('connection-status');

window.addEventListener('online', () => {
  connectionStatus.textContent = 'You are online';
  connectionStatus.classList.remove('hidden', 'bg-red-500', 'text-white');
  connectionStatus.classList.add('bg-green-500', 'text-white');
});

window.addEventListener('offline', () => {
  connectionStatus.textContent = 'You are offline';
  connectionStatus.classList.remove('hidden', 'bg-green-500', 'text-white');
  connectionStatus.classList.add('bg-red-500', 'text-white');
}); 