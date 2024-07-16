if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(error => {
        console.log('Service Worker registration failed:', error);
    });
}

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installButton = document.createElement('button');
    installButton.textContent = 'Installer l\'application';
    installButton.style.display = 'block';
    document.body.appendChild(installButton);

    installButton.addEventListener('click', () => {
        installButton.style.display = 'none';
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    });
});

let db;
const request = indexedDB.open('my-database', 1);

request.onerror = event => {
    console.log('Database error: ' + event.target.errorCode);
};

request.onsuccess = event => {
    db = event.target.result;
    console.log('Database opened successfully');
};

request.onupgradeneeded = event => {
    db = event.target.result;
    const objectStore = db.createObjectStore('my-store', { keyPath: 'id', autoIncrement: true });
    objectStore.createIndex('name', 'name', { unique: false });
    objectStore.createIndex('age', 'age', { unique: false });
    console.log('Database setup complete');
};

function saveData() {
    const transaction = db.transaction(['my-store'], 'readwrite');
    const objectStore = transaction.objectStore('my-store');
    const data = { name: 'John Doe', age: 30 };
    const request = objectStore.add(data);

    request.onsuccess = () => {
        console.log('Data added to the database');
    };

    request.onerror = () => {
        console.log('Error adding data to the database');
    };
}

function loadData() {
    const transaction = db.transaction(['my-store']);
    const objectStore = transaction.objectStore('my-store');
    const request = objectStore.getAll();

    request.onsuccess = event => {
        console.log('Data loaded from the database:', event.target.result);
    };

    request.onerror = () => {
        console.log('Error loading data from the database');
    };
}

document.getElementById('saveDataButton').addEventListener('click', saveData);
document.getElementById('loadDataButton').addEventListener('click', loadData);

