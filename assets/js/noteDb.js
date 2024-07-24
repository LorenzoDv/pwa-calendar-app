document.addEventListener('DOMContentLoaded', function () {
    let db;
    let selectedNoteId;

    // Ouvrir la base de données IndexedDB
    const request = indexedDB.open('NotesDB', 1);

    request.onerror = event => {
        console.error('Database error:', event.target.errorCode);
    };

    request.onsuccess = event => {
        db = event.target.result;
        console.log('Database opened successfully');
        loadNotesFromDB(); // Charger les notes dès que la DB est prête
    };

    request.onupgradeneeded = event => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('notes')) {
            const objectStore = db.createObjectStore('notes', {keyPath: 'id', autoIncrement: true});
            objectStore.createIndex('title', 'title', {unique: false});
            objectStore.createIndex('content', 'content', {unique: false});
            objectStore.createIndex('color', 'color', {unique: false});
            objectStore.createIndex('startDate', 'startDate', {unique: false});
            objectStore.createIndex('endDate', 'endDate', {unique: false});
            console.log('Object store created successfully');
        }
    };

    // Ajouter une note à IndexedDB
    function addNoteToDB(note) {
        const transaction = db.transaction(['notes'], 'readwrite');
        const store = transaction.objectStore('notes');
        const request = store.add(note);

        request.onsuccess = function () {
            console.log("Note added to IndexedDB");
            loadNotesFromDB(); // Rafraîchir les notes après l'ajout
        };

        request.onerror = function (e) {
            console.error("Error adding note to IndexedDB", e);
        };
    }

    // Mettre à jour une note dans IndexedDB
    function updateNoteInDB(note) {
        const transaction = db.transaction(['notes'], 'readwrite');
        const store = transaction.objectStore('notes');
        const request = store.put(note);

        request.onsuccess = function () {
            console.log("Note updated in IndexedDB");
            loadNotesFromDB(); // Rafraîchir les notes après la mise à jour
        };

        request.onerror = function (e) {
            console.error("Error updating note in IndexedDB", e);
        };
    }

    // Charger les notes depuis IndexedDB
    function loadNotesFromDB() {
        const transaction = db.transaction(['notes'], 'readonly');
        const store = transaction.objectStore('notes');
        const request = store.getAll();

        request.onsuccess = event => {
            const notes = event.target.result;
            displayNotes(notes);
        };

        request.onerror = () => {
            console.error('Error loading notes from IndexedDB');
        };
    }

    // Afficher les notes dans le DOM
    function displayNotes(notes) {
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = ''; // Vider la liste actuelle

        notes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.classList.add('note-item');
            noteElement.style.backgroundColor = note.color; // Appliquer la couleur de fond
            noteElement.dataset.id = note.id; // Ajouter l'ID de la note pour la modification
            noteElement.innerHTML = `
                <h3>${note.title}</h3>
                <p>${note.content}</p>
                <p><strong>Date de début:</strong> ${note.startDate || 'Non spécifiée'}</p>
                <p><strong>Date de fin:</strong> ${note.endDate || 'Non spécifiée'}</p>
            `;
            notesList.appendChild(noteElement);
        });

        // Ajouter les gestionnaires de clic aux notes
        document.querySelectorAll('.note-item').forEach(noteItem => {
            noteItem.addEventListener('click', function () {
                const noteId = parseInt(this.dataset.id, 10);
                loadNoteForEdit(noteId);
            });
        });
    }

    // Charger une note pour modification
    function loadNoteForEdit(noteId) {
        const transaction = db.transaction(['notes'], 'readonly');
        const store = transaction.objectStore('notes');
        const request = store.get(noteId);

        request.onsuccess = event => {
            const note = event.target.result;
            if (note) {
                populateEditModal(note);
                document.getElementById('editNoteModal').style.display = 'block';
            }
        };

        request.onerror = () => {
            console.error('Error loading note for edit');
        };
    }

    // Remplir la modal de modification avec les données de la note
    function populateEditModal(note) {
        document.getElementById('editNoteId').value = note.id;
        document.getElementById('editNoteTitle').value = note.title;
        document.getElementById('editNoteContent').value = note.content;
        document.getElementById('editNoteStartDate').value = note.startDate || '';
        document.getElementById('editNoteEndDate').value = note.endDate || '';

        // Pré-sélectionner la couleur
        const colorSquares = document.querySelectorAll('#editColorPicker .color-square');
        colorSquares.forEach(square => {
            if (square.getAttribute('data-color') === note.color) {
                square.classList.add('selected');
            } else {
                square.classList.remove('selected');
            }
        });
    }

    // Ajouter un gestionnaire de clic à la couleur pour la modal de modification
    document.getElementById('editColorPicker').addEventListener('click', function (event) {
        if (event.target.classList.contains('color-square')) {
            document.querySelectorAll('#editColorPicker .color-square').forEach(square => square.classList.remove('selected'));
            event.target.classList.add('selected');
        }
    });

    // Mettre à jour une note depuis le formulaire de modification
    document.getElementById('editNoteForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const noteId = parseInt(document.getElementById('editNoteId').value, 10);
        const title = document.getElementById('editNoteTitle').value;
        const content = document.getElementById('editNoteContent').value;
        const color = document.querySelector('#editColorPicker .color-square.selected')?.getAttribute('data-color') || '#FFFF00';
        const startDate = document.getElementById('editNoteStartDate').value;
        const endDate = document.getElementById('editNoteEndDate').value;

        const updatedNote = {
            id: noteId,
            title: title,
            content: content,
            color: color,
            startDate: startDate,
            endDate: endDate
        };

        updateNoteInDB(updatedNote);

        // Réinitialiser le formulaire et fermer la modal
        document.getElementById('editNoteForm').reset();
        document.querySelector('#editColorPicker .color-square.selected')?.classList.remove('selected');
        document.getElementById('editNoteModal').style.display = 'none';
    });

    // Fermer la modal de modification
    document.getElementById('closeEditNoteModal').addEventListener('click', function () {
        document.getElementById('editNoteModal').style.display = 'none';
    });

    window.addEventListener('click', function (event) {
        if (event.target === document.getElementById('editNoteModal')) {
            document.getElementById('editNoteModal').style.display = 'none';
        }
    });
});
