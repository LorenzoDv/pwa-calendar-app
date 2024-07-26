document.addEventListener('DOMContentLoaded', function () {
    let db;

    // Open (or create) the database
    const request = indexedDB.open('ColorsDB', 1);

    request.onerror = event => {
        console.error('Database error:', event.target.errorCode);
    };

    request.onsuccess = event => {
        db = event.target.result;
        console.log('Database opened successfully');
        displayColors();
    };

    request.onupgradeneeded = event => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('colors')) {
            const objectStore = db.createObjectStore('colors', {keyPath: 'color'});
            objectStore.createIndex('name', 'name', {unique: false});
            console.log('Object store created successfully');
        }
    };

    // Function to save color
    window.saveColor = function (color, name) {
        const transaction = db.transaction(['colors'], 'readwrite');
        const objectStore = transaction.objectStore('colors');

        const colorEntry = {
            color: color,
            name: name
        };

        const request = objectStore.put(colorEntry);

        request.onsuccess = () => {
            console.log('Color saved successfully');
            displayColors();
        };

        request.onerror = event => {
            console.error('Error saving color:', event.target.errorCode);
        };
    };

    // Function to get all colors and display them
    function displayColors() {
        const transaction = db.transaction(['colors'], 'readonly');
        const objectStore = transaction.objectStore('colors');
        const request = objectStore.getAll();

        request.onsuccess = event => {
            const colors = event.target.result;
            document.querySelectorAll('.legende-color').forEach(div => {
                const span = div.querySelector('span');
                const color = span.style.backgroundColor;
                const p = div.querySelector('p');
                const colorEntry = colors.find(entry => entry.color === color);
                if (colorEntry) {
                    p.textContent = colorEntry.name;
                }
            });
        };

        request.onerror = event => {
            console.error('Error retrieving colors:', event.target.errorCode);
        };
    }

    // Open modal function
    window.openModal = function () {
        const modal = document.getElementById('myModal');
        modal.style.display = 'block';
        displayModalColors();
    };

    // Close modal function
    window.closeModal = function () {
        const modal = document.getElementById('myModal');
        modal.style.display = 'none';
    };

    // Display colors in modal
    function displayModalColors() {
        const transaction = db.transaction(['colors'], 'readonly');
        const objectStore = transaction.objectStore('colors');
        const request = objectStore.getAll();

        request.onsuccess = event => {
            const colors = event.target.result;
            const modalFormContainer = document.getElementById('modalFormContainer');
            modalFormContainer.innerHTML = '';
            document.querySelectorAll('.legende-color').forEach(div => {
                const span = div.querySelector('span');
                const color = span.style.backgroundColor;
                const p = div.querySelector('p');
                const colorEntry = colors.find(entry => entry.color === color);
                const name = colorEntry ? colorEntry.name : p.textContent;

                const formDiv = document.createElement('div');
                formDiv.className = 'modal-form';
                formDiv.innerHTML = `
                    <span style="background-color: ${color};"></span>
                    <input type="text" value="${name}" data-color="${color}">
                `;
                modalFormContainer.appendChild(formDiv);
            });
        };

        request.onerror = event => {
            console.error('Error retrieving colors:', event.target.errorCode);
        };
    }

    // Save all changes from modal
    window.saveAllChanges = function () {
        const inputs = document.querySelectorAll('#modalFormContainer input');
        inputs.forEach(input => {
            const color = input.getAttribute('data-color');
            const name = input.value;
            saveColor(color, name);
        });
        closeModal();
    };
});
