document.addEventListener('DOMContentLoaded', function () {
    let db;
    let calendar;

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
            const objectStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
            objectStore.createIndex('title', 'title', { unique: false });
            objectStore.createIndex('desc', 'desc', { unique: false });
            objectStore.createIndex('start', 'start', { unique: false });
            objectStore.createIndex('end', 'end', { unique: false });
            objectStore.createIndex('color', 'color', { unique: false });
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

    // Initialiser le calendrier avec les événements
    function initializeCalendar(events) {
        var calendarEl = document.getElementById('calendar');
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'fr',
            events: events,
            selectable: true,
            select: function (info) {
                // Créez un ID temporaire ou générez un ID unique
                const tempId = new Date().getTime(); // Utilisez un timestamp comme ID temporaire

                // Stockez les informations dans un objet événement avec un ID temporaire
                const newEvent = {
                    id: tempId,
                    title: '', // Rempli plus tard par l'utilisateur
                    desc: '', // Rempli plus tard par l'utilisateur
                    start: info.startStr,
                    end: info.endStr || info.startStr,
                    color: '#000000' // Valeur par défaut
                };

                // Affichez le modal avec les dates sélectionnées
                showModal(info.startStr, info.endStr || info.startStr, newEvent);

                console.log("Event selected:", newEvent);
            },
            eventClick: function (info) {
                var event = info.event;
                showModalForEdit(event);
                console.log("yo")
            },
            eventDidMount: function (info) {
                var deleteIcon = document.createElement('span');
                deleteIcon.classList.add('delete-event');
                deleteIcon.innerHTML = '&times;';
                info.el.appendChild(deleteIcon);

                deleteIcon.addEventListener('click', function () {
                    if (confirm("Voulez-vous vraiment supprimer cet événement ?")) {
                        var eventToRemove = info.event;
                        var eventId = Number(eventToRemove.id); // Convertir l'ID en nombre
                        removeEventFromDB(eventId);
                        eventToRemove.remove();
                        calendar.refetchEvents();
                    }
                });
            }
        });

        calendar.render();

        var addButton = document.getElementById('addEvent');
        if (addButton) {
            addButton.addEventListener('click', function (e) {
                e.preventDefault();
                handleAddOrUpdateEvent(); // Passer l'événement ici si nécessaire
            });
        }
    }

    // Afficher le modal pour ajouter ou modifier un événement
    function showModal(fromDate, toDate, newEvent = null) {
        var modal = document.getElementById('eventModal');
        modal.style.display = 'block';
        document.getElementById('fromDate').value = fromDate;
        document.getElementById('toDate').value = toDate;

        // Remplir le formulaire avec les détails de l'événement, si fourni
        if (newEvent) {
            document.getElementById('eventName').value = newEvent.title || '';
            document.getElementById('eventDescription').value = newEvent.desc || '';
            document.getElementById('fromDate').value = newEvent.start;
            document.getElementById('toDate').value = newEvent.end;

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
            addButton.setAttribute('id', 'updateEvent');
            addButton.dataset.eventId = newEvent.id;

            addButton.removeEventListener('click', handleAddOrUpdateEvent);
            addButton.addEventListener('click', function (e) {
                e.preventDefault();
                const updatedEvent = {
                    id: addButton.dataset.eventId,
                    title: document.getElementById('eventName').value,
                    desc: document.getElementById('eventDescription').value,
                    start: document.getElementById('fromDate').value,
                    end: document.getElementById('toDate').value,
                    color: document.querySelector('.color-square.selected')?.getAttribute('data-color') || '#000000'
                };

                console.log('Submitting event:', updatedEvent);
                handleAddOrUpdateEvent(updatedEvent);
            });
        } else {
            // Gestion des cas où aucun événement n'est fourni
            document.getElementById('eventName').value = '';
            document.getElementById('eventDescription').value = '';
            document.getElementById('fromDate').value = fromDate;
            document.getElementById('toDate').value = toDate;
        }
    }


    // Fermer le modal et réinitialiser les champs
    function closeModal() {
        var modal = document.getElementById('eventModal');
        modal.style.display = 'none';
        document.getElementById('eventName').value = '';
        document.getElementById('fromDate').value = '';
        document.getElementById('toDate').value = '';
        document.getElementById('eventDescription').value = '';
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

        console.log(event)
        var modal = document.getElementById('eventModal');
        modal.style.display = 'block';

        document.getElementById('eventName').value = event.title;
        document.getElementById('eventDescription').value = event.extendedProps.desc || '';
        document.getElementById('fromDate').value = event.startStr;
        document.getElementById('toDate').value = event.endStr || event.startStr;

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
        addButton.setAttribute('id', 'updateEvent');
        addButton.dataset.eventId = event.id; // Ajouter l'ID de l'événement aux données du bouton

        addButton.removeEventListener('click', handleAddOrUpdateEvent);
        addButton.addEventListener('click', function (e) {
            e.preventDefault();

            const newEvent = {
                id: event?.id || null, // Utilisez `null` si `event` n'est pas défini
                title: document.getElementById('eventName').value,
                desc: document.getElementById('eventDescription').value,
                start: document.getElementById('fromDate').value,
                end: document.getElementById('toDate').value,
                color: document.querySelector('.color-square.selected')?.getAttribute('data-color') || '#000000'
            };

            console.log('Submitting event for update:', newEvent);
            handleAddOrUpdateEvent(newEvent);
        });
    }

    function handleAddOrUpdateEvent(event) {
        console.log('Handling event:', event);

        if (isValidEvent(event)) {
            if (event.id) {
                console.log("Updating existing event with ID:", event.id);
                updateEventInDB(event);

                // Mise à jour de l'événement dans FullCalendar
                const fcEvent = calendar.getEventById(event.id);
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
