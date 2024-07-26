document.addEventListener('DOMContentLoaded', function () {
    let db;
    let editor;
    let selectedNoteId;

    // Ouvrir la base de données IndexedDB
    const request = indexedDB.open('NotesDB', 2);

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

    function addNoteToDB(note) {
        const transaction = db.transaction(['notes'], 'readwrite');
        const store = transaction.objectStore('notes');
        const request = store.add(note);

        request.onsuccess = function () {
            console.log("Note added to IndexedDB");
            loadNotesFromDB();
        };

        request.onerror = function (e) {
            console.error("Error adding note to IndexedDB", e);
        };
    }

    function updateNoteInDB(note) {
        const transaction = db.transaction(['notes'], 'readwrite');
        const store = transaction.objectStore('notes');
        const request = store.put(note);

        request.onsuccess = function () {
            console.log("Note updated in IndexedDB");
            loadNotesFromDB();
        };

        request.onerror = function (e) {
            console.error("Error updating note in IndexedDB", e);
        };
    }

    function deleteNoteFromDB(noteId) {
        const transaction = db.transaction(['notes'], 'readwrite');
        const store = transaction.objectStore('notes');
        const request = store.delete(noteId);

        request.onsuccess = function () {
            console.log("Note deleted from IndexedDB");
            loadNotesFromDB();
        };

        request.onerror = function (e) {
            console.error("Error deleting note from IndexedDB", e);
        };
    }

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

    function displayNotes(notes) {
        const notesList = document.getElementById('external-events');
        if (notesList) {
            notesList.innerHTML = '';

            notes.forEach(note => {
                const noteElement = document.createElement('div');
                noteElement.classList.add('note-item');
                noteElement.style.backgroundColor = note.color;
                noteElement.dataset.id = note.id;
                noteElement.draggable = true; // Rendre les notes déplaçables
                noteElement.innerHTML = `
                    <h3>${note.title}</h3>
                    <h3>${note.content}</h3>
                    <p><strong>Date de début:</strong> ${note.startDate || 'Non spécifiée'}</p>
                    <p><strong>Date de fin:</strong> ${note.endDate || 'Non spécifiée'}</p>
                `;
                notesList.appendChild(noteElement);

                // Ajouter l'événement dragstart
                noteElement.addEventListener('dragstart', function (event) {
                    event.dataTransfer.setData('text/plain', JSON.stringify(note));
                });
            });

            document.querySelectorAll('.note-item').forEach(noteItem => {
                noteItem.addEventListener('click', function () {
                    const noteId = parseInt(this.dataset.id, 10);
                    loadNoteForEdit(noteId);
                });
            });
        }
    }

    function initializeEditor(holderId, data = {}) {
        if (editor) {
            editor.destroy();
        }
        editor = new EditorJS({
            holder: holderId,
            tools: {
                header: Header,
                checklist: Checklist
            },
            data: data,
            onReady: function () {
                console.log(`Editor.js is ready for ${holderId}`);
            },
            onChange: function () {
                console.log('Content changed in Editor.js');
            }
        });
    }

    function loadNoteForEdit(noteId) {
        const transaction = db.transaction(['notes'], 'readonly');
        const store = transaction.objectStore('notes');
        const request = store.get(noteId);

        request.onsuccess = event => {
            const note = event.target.result;
            if (note) {
                populateEditModal(note);
                selectedNoteId = note.id;
                document.getElementById('editNoteModal').style.display = 'block';
            }
        };

        request.onerror = () => {
            console.error('Error loading note for edit');
        };
    }

    function populateEditModal(note) {
        document.getElementById('editNoteId').value = note.id;
        document.getElementById('editNoteTitle').value = note.title;

        const editorData = note.content ? JSON.parse(note.content) : {};
        initializeEditor('editorjsEdit', editorData);

        document.getElementById('editNoteStartDate').value = note.startDate || '';
        document.getElementById('editNoteEndDate').value = note.endDate || '';

        const colorSquares = document.querySelectorAll('#editColorPicker .color-square');
        colorSquares.forEach(square => {
            if (square.getAttribute('data-color') === note.color) {
                square.classList.add('selected');
            } else {
                square.classList.remove('selected');
            }
        });
    }

    document.getElementById('addNoteBtn')?.addEventListener('click', function () {
        document.getElementById('noteModal').style.display = 'block';
        initializeEditor('editorjsAdd');
    });

    document.getElementById('closeNoteModal')?.addEventListener('click', function () {
        document.getElementById('noteModal').style.display = 'none';
    });

    document.getElementById('closeEditNoteModal')?.addEventListener('click', function () {
        document.getElementById('editNoteModal').style.display = 'none';
    });

    document.getElementById('editColorPicker')?.addEventListener('click', function (event) {
        if (event.target.classList.contains('color-square')) {
            document.querySelectorAll('#editColorPicker .color-square').forEach(square => square.classList.remove('selected'));
            event.target.classList.add('selected');
        }
    });

    document.getElementById('editNoteForm')?.addEventListener('submit', function (event) {
        event.preventDefault();
        console.log('Edit form submitted');

        const noteId = parseInt(document.getElementById('editNoteId').value, 10);
        const title = document.getElementById('editNoteTitle').value;
        const color = document.querySelector('#editColorPicker .color-square.selected')?.getAttribute('data-color') || '#FFFF00';
        const startDate = document.getElementById('editNoteStartDate').value;
        const endDate = document.getElementById('editNoteEndDate').value;

        editor.save().then((outputData) => {
            console.log('Editor data saved:', outputData);

            const updatedNote = {
                id: noteId,
                title: title,
                content: JSON.stringify(outputData),
                color: color,
                startDate: startDate,
                endDate: endDate
            };

            updateNoteInDB(updatedNote);

            document.getElementById('editNoteForm').reset();
            document.querySelector('#editColorPicker .color-square.selected')?.classList.remove('selected');
            document.getElementById('editNoteModal').style.display = 'none';
        }).catch((error) => {
            console.error('Saving editor content failed:', error);
        });
    });

    document.getElementById('deleteNoteBtn')?.addEventListener('click', function () {
        if (selectedNoteId) {
            deleteNoteFromDB(selectedNoteId);
            document.getElementById('editNoteModal').style.display = 'none';
        }
    });

    document.getElementById('noteForm')?.addEventListener('submit', function (event) {
        event.preventDefault();
        console.log('Add form submitted');

        const title = document.getElementById('noteTitle').value;
        const color = document.querySelector('#colorPickerNotes .color-square.selected')?.getAttribute('data-color') || '#FFFF00';
        const startDate = document.getElementById('noteStartDate').value;
        const endDate = document.getElementById('noteEndDate').value;

        editor.save().then((outputData) => {
            console.log('Editor data saved:', outputData);

            const newNote = {
                title: title,
                content: JSON.stringify(outputData),
                color: color,
                startDate: startDate,
                endDate: endDate
            };

            addNoteToDB(newNote);

            document.getElementById('noteForm').reset();
            document.querySelector('#colorPickerNotes .color-square.selected')?.classList.remove('selected');
            document.getElementById('noteModal').style.display = 'none';
        }).catch((error) => {
            console.error('Saving editor content failed:', error);
        });
    });
});
