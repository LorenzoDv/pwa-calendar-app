document.addEventListener('DOMContentLoaded', function () {
    let db;
    let calendar;
    let editor;

    // Ouvrir la base de données IndexedDB
    const request = indexedDB.open('Calendrier', 2);

    request.onerror = event => {
        console.error('Database error:', event.target.errorCode);
    };

    request.onsuccess = event => {
        db = event.target.result;
        console.log('Database opened successfully');
        loadEventsFromDB();
    };

    request.onupgradeneeded = event => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('events')) {
            const objectStore = db.createObjectStore('events', {keyPath: 'id', autoIncrement: true});
            objectStore.createIndex('title', 'title', {unique: false});
            objectStore.createIndex('desc', 'desc', {unique: false});
            objectStore.createIndex('start', 'start', {unique: false});
            objectStore.createIndex('end', 'end', {unique: false});
            objectStore.createIndex('color', 'color', {unique: false});
            console.log('Object store created successfully');
        }
    };

    // Ajouter un événement à IndexedDB
    function addEventToDB(event) {
        const transaction = db.transaction(['events'], 'readwrite');
        const store = transaction.objectStore('events');
        const request = store.add(event);

        request.onsuccess = function () {
            console.log("Event added to IndexedDB");
            loadEventsFromDB(); // Rafraîchir les événements après l'ajout
        };

        request.onerror = function (e) {
            console.error("Error adding event to IndexedDB", e);
        };
    }

    // Mettre à jour un événement dans IndexedDB
    function updateEventInDB(event) {
        if (isValidEvent(event) && event.id) {
            const transaction = db.transaction(['events'], 'readwrite');
            const store = transaction.objectStore('events');
            const request = store.put(event);

            request.onsuccess = () => {
                console.log('Event updated in IndexedDB');
                loadEventsFromDB(); // Rafraîchir les événements après la mise à jour
            };

            request.onerror = () => {
                console.error('Error updating event in IndexedDB');
            };
        }
    }

    // Vérifier la validité de l'événement
    function isValidEvent(event) {
        return event.title && event.start && event.end && event.color;
    }

    // Charger les événements depuis IndexedDB
    function loadEventsFromDB() {
        const transaction = db.transaction(['events'], 'readonly');
        const store = transaction.objectStore('events');
        const request = store.getAll();

        request.onsuccess = event => {
            const events = event.target.result;
            // Convertir les IDs en nombres pour la cohérence
            events.forEach(e => e.id = Number(e.id));
            console.log('Events loaded from IndexedDB:', events);
            initializeCalendar(events);
        };

        request.onerror = () => {
            console.error('Error loading events from IndexedDB');
        };
    }


    let containerEl = document.getElementById('external-events');
    new FullCalendar.Draggable(containerEl, {
        itemSelector: '.note-item',
        eventData: function (eventEl) {
            let title = eventEl.querySelector('h1').innerText;
            let desc = eventEl.querySelector('h3').innerText;
            let start = eventEl.querySelector('p:nth-of-type(1)').innerText.split(': ')[1];
            let end = eventEl.querySelector('p:nth-of-type(2)').innerText.split(': ')[1];
            let color = eventEl.style.backgroundColor;

            return {
                title: title,
                desc: desc,
                start: start,
                end: end,
                backgroundColor: color
            };
        }
    });


    function rgbaToRgb(rgba) {
        // Extraire les valeurs numériques de la chaîne rgba
        const rgbaValues = rgba.match(/\d+/g);

        if (rgbaValues && rgbaValues.length >= 3) {
            const r = rgbaValues[0];
            const g = rgbaValues[1];
            const b = rgbaValues[2];

            // Retourner la chaîne rgb sans la valeur alpha
            return `rgb(${r}, ${g}, ${b})`;
        }

        // Si la chaîne rgba n'est pas valide, retourner une chaîne vide ou une couleur par défaut
        return '';
    }

    // Initialiser le calendrier avec les événements
    function initializeCalendar(events) {
        var calendarEl = document.getElementById('calendar');
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'fr',
            events: events,
            selectable: true,
            droppable: true,
            editable: true, // Permet de déplacer les événements
            drop: function (info) {
                let event = info.draggedEl;
                const rgbColor = rgbaToRgb(event.style.backgroundColor);
            
                let newEvent = {
                    title: event.querySelector('h1').innerText,
                    desc: event.querySelector('h3').innerText,
                    start: info.dateStr,
                    end: info.dateStr, // Ajustez si nécessaire
                    color: rgbColor
                };
                addEventToDB(newEvent); // Ajouter l'événement à la base de données
            },
            eventReceive: function (info) {
                // Cette fonction est appelée quand un événement est reçu dans le calendrier
                console.log('Event received:', info.event);
            },
            select: function (info) {
                const newEvent = {
                    id: '',
                    title: '', // Rempli plus tard par l'utilisateur
                    desc: '', // Rempli plus tard par l'utilisateur
                    start: info.startStr,
                    end: info.endStr || info.startStr,
                    color: '#000000' // Valeur par défaut
                };

                showModal(info.startStr, info.endStr || info.startStr, newEvent);
            },
            eventClick: function (info) {
                var event = info.event;
                showModalForEdit(event);
            },
        });

        calendar.render();
    }


    // Initialiser Editor.js
    function initializeEditor(data = {}) {
        if (editor) {
            editor.destroy();
        }
        editor = new EditorJS({
            holder: 'editorjs',
            tools: {
                header: Header,
                checklist: Checklist
            },
            data: data,
            onReady: function () {
                console.log('Editor.js is ready to work!');
            },
            onChange: function () {
                console.log('Content changed in Editor.js');
            }
        });
    }

    // Afficher le modal pour ajouter ou modifier un événement
    function showModal(fromDate, toDate, newEvent = null) {

        console.log(newEvent)

        var modal = document.getElementById('eventModal');
        modal.style.display = 'block';
        document.getElementById('fromDate').value = fromDate;
        document.getElementById('toDate').value = toDate;

        // Remplir le formulaire avec les détails de l'événement, si fourni
        if (newEvent) {
            document.getElementById('eventName').value = newEvent.title || '';
            document.getElementById('fromDate').value = newEvent.start;
            document.getElementById('toDate').value = newEvent.end;

            // Charger les données de l'éditeur
            const editorData = newEvent.desc ? JSON.parse(newEvent.desc) : {};
            initializeEditor(editorData);

            // Pré-sélectionner la couleur
            var colorSquares = document.querySelectorAll('.color-square');
            colorSquares.forEach(square => {
                if (square.getAttribute('data-color') === newEvent.color) {
                    square.classList.add('selected');
                } else {
                    square.classList.remove('selected');
                }
            });

            // Mettre à jour le bouton pour ajouter ou mettre à jour
            var addButton = document.getElementById('addEvent');
            addButton.innerHTML = 'Add Event';
            addButton.setAttribute('id', 'addEvent');
            addButton.dataset.eventId = newEvent.id;

            addButton.removeEventListener('click', handleAddOrUpdateEvent);
            addButton.addEventListener('click', function (e) {
                e.preventDefault();
                saveEditorContent(newEvent);
            });
        } else {
            // Gestion des cas où aucun événement n'est fourni
            document.getElementById('eventName').value = '';
            document.getElementById('fromDate').value = fromDate;
            document.getElementById('toDate').value = toDate;
            initializeEditor();
        }
    }

    // Fermer le modal et réinitialiser les champs
    function closeModal() {
        var modal = document.getElementById('eventModal');
        modal.style.display = 'none';
        document.getElementById('eventName').value = '';
        document.getElementById('fromDate').value = '';
        document.getElementById('toDate').value = '';
        var selectedColorSquare = document.querySelector('.color-square.selected');
        if (selectedColorSquare) {
            selectedColorSquare.classList.remove('selected');
        }
        var addButton = document.getElementById('updateEvent');
        if (addButton) {
            addButton.setAttribute('id', 'addEvent');
            addButton.innerHTML = 'Add Event';
            addButton.removeEventListener('click', handleAddOrUpdateEvent);
            addButton.addEventListener('click', function (e) {
                e.preventDefault();
                handleAddOrUpdateEvent(); // Passer l'événement ici si nécessaire
            });
        }
    }

    document.getElementById('closeModal').addEventListener('click', function () {
        closeModal();
    });

    // Supprimer un événement d'IndexedDB
    function removeEventFromDB(eventId) {
        const transaction = db.transaction(['events'], 'readwrite');
        const store = transaction.objectStore('events');
        const request = store.delete(eventId);

        request.onsuccess = () => {
            console.log('Event removed from IndexedDB with ID:', eventId);
            loadEventsFromDB();
        };

        request.onerror = (event) => {
            console.error('Error removing event from IndexedDB', event.target.error);
        };
    }

    // Afficher le modal pour éditer un événement
    function showModalForEdit(event) {
        var modal = document.getElementById('eventModal');
        modal.style.display = 'block';

        document.getElementById('eventName').value = event.title;
        document.getElementById('fromDate').value = event.startStr;
        document.getElementById('toDate').value = event.endStr || event.startStr;

        // Charger les données de l'éditeur
        const editorData = event.extendedProps.desc ? JSON.parse(event.extendedProps.desc) : {};
        initializeEditor(editorData);

        var colorSquares = document.querySelectorAll('.color-square');
        colorSquares.forEach(square => {
            if (square.getAttribute('data-color') === event.backgroundColor) {
                square.classList.add('selected');
            } else {
                square.classList.remove('selected');
            }
        });

        var addButton = document.getElementById('addEvent');
        addButton.innerHTML = 'Update Event';
        addButton.setAttribute('id', 'addEvent');
        addButton.dataset.eventId = event.id; // Ajouter l'ID de l'événement aux données du bouton
        addButton.removeEventListener('click', handleAddOrUpdateEvent);
        addButton.addEventListener('click', function (e) {
            e.preventDefault();
            saveEditorContent(event);
        });

        // Configurer le bouton de suppression
        var deleteButton = document.getElementById('deleteEvent');
        deleteButton.addEventListener('click', function () {
            if (confirm("Voulez-vous vraiment supprimer cet événement ?")) {
                var eventId = Number(event.id);
                removeEventFromDB(eventId);
                calendar.getEventById(eventId).remove();
                closeModal();
            }
        });
    }


    // Sauvegarder le contenu de l'éditeur
    function saveEditorContent(event) {

        const addButton = document.getElementById('addEvent');
        let dataEventId = addButton.dataset.eventId || new Date().getTime();

        editor.save().then((outputData) => {
            const newEvent = {
                id: Number(dataEventId),
                title: document.getElementById('eventName').value,
                desc: JSON.stringify(outputData), // Sauvegarder le contenu de l'éditeur en JSON
                start: document.getElementById('fromDate').value,
                end: document.getElementById('toDate').value,
                color: document.querySelector('.color-square.selected')?.getAttribute('data-color') || '#000000'
            };

            console.log('Submitting event with editor content:', newEvent);


            handleAddOrUpdateEvent(newEvent);
        }).catch((error) => {
            console.error('Saving editor content failed:', error);
        });
    }

    function handleAddOrUpdateEvent(event) {


        if (isValidEvent(event)) {

            console.log('-----------------yy----------------------------')
            console.log(event.id)
            console.log('-----------------yy----------------------------')

            if (event.id) {
                console.log("Updating existing event with ID:", event.id);
                updateEventInDB(event);

                // Mise à jour de l'événement dans FullCalendar
                const fcEvent = calendar.getEventById(Number(event.id)); // Convertir l'ID en nombre
                if (fcEvent) {
                    fcEvent.setProp('title', event.title);
                    fcEvent.setExtendedProp('desc', event.desc);
                    fcEvent.setDates(event.start, event.end);
                    fcEvent.setProp('backgroundColor', event.color);
                } else {
                    console.log("No FullCalendar event found with ID:", event.id);
                }
            } else {
                console.log("Adding new event:", event);
                addEventToDB(event);
            }

            if (calendar) {
                calendar.refetchEvents();
            }

            closeModal();
        } else {
            console.log("Invalid event data:", event);
        }
    }
});
