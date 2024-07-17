document.addEventListener('DOMContentLoaded', function () {
    let db;

    const request = indexedDB.open('Calendrier', 2); // Augmentez le numéro de version si nécessaire

    request.onerror = event => {
        console.error('Database error:', event.target.errorCode);
    };

    request.onsuccess = event => {
        db = event.target.result;
        console.log('Database opened successfully');
        loadEventsFromDB(); // Charger les événements depuis IndexedDB lorsque la base de données est ouverte
    };

    request.onupgradeneeded = event => {
        db = event.target.result;
        // Créer un magasin d'objets pour les événements s'il n'existe pas encore
        if (!db.objectStoreNames.contains('events')) {
            const objectStore = db.createObjectStore('events', {keyPath: 'id', autoIncrement: true});
            objectStore.createIndex('title', 'title', {unique: false});
            objectStore.createIndex('desc', 'title', {unique: false});
            objectStore.createIndex('start', 'start', {unique: false});
            objectStore.createIndex('end', 'end', {unique: false});
            objectStore.createIndex('color', 'color', {unique: false});
            console.log('Object store created successfully');
        }
    };

    // Fonction pour ajouter un événement à IndexedDB
    function addEventToDB(event) {
        const transaction = db.transaction(['events'], 'readwrite');
        const objectStore = transaction.objectStore('events');
        const request = objectStore.add(event);

        request.onsuccess = () => {
            console.log('Event added to IndexedDB');
            loadEventsFromDB(); // Recharger les événements après l'ajout
        };

        request.onerror = () => {
            console.error('Error adding event to IndexedDB');
        };
    }

    // Fonction pour charger les événements depuis IndexedDB
    function loadEventsFromDB() {
        const transaction = db.transaction(['events'], 'readonly');
        const objectStore = transaction.objectStore('events');
        const request = objectStore.getAll();

        request.onsuccess = event => {
            const events = event.target.result;
            console.log('Events loaded from IndexedDB:', events);
            initializeCalendar(events); // Initialiser le calendrier avec les événements chargés
        };

        request.onerror = () => {
            console.error('Error loading events from IndexedDB');
        };
    }

    // Fonction pour initialiser le calendrier avec les événements chargés
    function initializeCalendar(events) {
        var calendarEl = document.getElementById('calendar');
        var calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'fr',
            events: events, // Charger les événements depuis IndexedDB
            selectable: true,
            select: function (info) {
                var fromDate = info.startStr;
                var toDate = info.endStr || info.startStr; // Si c'est une journée entière, 'endStr' peut être null

                // Afficher la modal avec le formulaire
                showModal(fromDate, toDate);
            },
            eventClick: function (info) {
                var event = info.event;

                // Afficher la modal avec les détails de l'événement pour modification
                showModalForEdit(event);
            },
            eventDidMount: function (info) {
                var deleteIcon = document.createElement('span');
                deleteIcon.classList.add('delete-event');
                deleteIcon.innerHTML = '&times;'; // Ajouter une icône de croix (×)
                info.el.appendChild(deleteIcon);

                deleteIcon.addEventListener('click', function () {
                    if (confirm("Voulez-vous vraiment supprimer cet événement ?")) {
                        var eventToRemove = info.event;
                        var eventId = eventToRemove.id;

                        // Supprimer l'événement de IndexedDB
                        removeEventFromDB(eventId);

                        // Mettre à jour l'array 'events'
                        events = events.filter(event => event.id !== eventId);

                        // Mettre à jour le calendrier
                        eventToRemove.remove(); // Supprimer de FullCalendar

                        calendar.refetchEvents();
                    }
                });
            }
        });

        calendar.render();

        // Écouteur pour le clic sur le bouton "Add Event" dans la modal
        document.getElementById('addEvent').addEventListener('click', function () {
            var eventName = document.getElementById('eventName').value;
            var desc = document.getElementById('eventDescription').value;
            var fromDate = document.getElementById('fromDate').value;
            var toDate = document.getElementById('toDate').value;
            var selectedColor = document.querySelector('.color-square.selected').getAttribute('data-color');

            const event = {
                title: eventName,
                desc: desc,
                start: fromDate,
                end: toDate,
                color: selectedColor
            };

            events.push(event);

            calendar.refetchEvents();
            addEventToDB(event); // Ajouter l'événement à IndexedDB

            // Fermer la modal après l'ajout de l'événement
            closeModal();
        });
    }

    // Fonction pour afficher la modal avec le formulaire
    function showModal(fromDate, toDate) {
        var modal = document.getElementById('eventModal');
        modal.style.display = 'block';

        document.getElementById('fromDate').value = fromDate;
        document.getElementById('toDate').value = toDate;
    }

    // Fonction pour fermer la modal
    function closeModal() {
        var modal = document.getElementById('eventModal');
        modal.style.display = 'none';

        // Réinitialiser les champs du formulaire
        document.getElementById('eventName').value = '';
        document.getElementById('fromDate').value = '';
        document.getElementById('toDate').value = '';
        document.getElementById('eventDescription').value = '';

        var selectedColorSquare = document.querySelector('.color-square.selected');
        if (selectedColorSquare) {
            selectedColorSquare.classList.remove('selected');
        }
    }

    // Écouteur pour le clic sur le bouton "Close" de la modal
    document.getElementById('closeModal').addEventListener('click', function () {
        closeModal();
    });

    // Fonction pour supprimer un événement de IndexedDB
    function removeEventFromDB(eventId) {
        const transaction = db.transaction(['events'], 'readwrite');
        const objectStore = transaction.objectStore('events');
        const request = objectStore.delete(Number(eventId));

        request.onsuccess = () => {
            console.log('Event removed from IndexedDB with ID:', eventId);
            loadEventsFromDB(); // Recharger les événements après la suppression
        };

        request.onerror = (event) => {
            console.error('Error removing event from IndexedDB', event.target.error);
        };
    }

    function showModalForEdit(event) {
        var modal = document.getElementById('eventModal');
        modal.style.display = 'block';
        console.log('test')
        // Pré-remplir les champs du formulaire avec les détails de l'événement sélectionné
        document.getElementById('eventName').value = event.title;
        document.getElementById('eventDescription').value = event.desc || '';
        document.getElementById('fromDate').value = event.startStr;
        document.getElementById('toDate').value = event.endStr || event.startStr;

        // Sélectionner la couleur de l'événement dans le color picker
        var colorSquares = document.querySelectorAll('.color-square');
        colorSquares.forEach(square => {
            if (square.getAttribute('data-color') === event.backgroundColor) {
                square.classList.add('selected');
            } else {
                square.classList.remove('selected');
            }
        });

        // Mettre à jour l'ID de l'événement dans le formulaire pour la mise à jour
        var addButton = document.getElementById('addEvent');
        addButton.innerHTML = 'Update Event';
        addButton.setAttribute('id', 'updateEvent');
        addButton.dataset.eventId = event.id; // Ajouter l'ID de l'événement au bouton

        // Supprimer l'ancien gestionnaire d'événements s'il existe
        addButton.removeEventListener('click', handleAddOrUpdateEvent);

        // Ajouter un nouveau gestionnaire d'événements pour la mise à jour de l'événement
        addButton.addEventListener('click', function (e) {
            e.preventDefault();

            // Récupérer l'ID de l'événement depuis le bouton (si nécessaire)
            var eventId = addButton.dataset.eventId;

            // Mettre à jour les données de l'événement
            event.id = eventId; // Assurez-vous que l'ID est correctement défini

            event.title = document.getElementById('eventName').value;
            event.desc = document.getElementById('eventDescription').value;
            event.startStr = document.getElementById('fromDate').value;
            event.endStr = document.getElementById('toDate').value;

            var selectedColorElement = document.querySelector('.color-square.selected');
            if (selectedColorElement) {
                event.backgroundColor = selectedColorElement.getAttribute('data-color');
            } else {
                // Gérer le cas où aucun élément n'est trouvé avec la classe 'color-square selected'
                console.error('No element found with class "color-square selected"');
            }

            // Appel de la fonction pour ajouter ou mettre à jour l'événement
            handleAddOrUpdateEvent(event);

            // Fermer la modal après la modification de l'événement
            closeModal();
        });
    }


    function updateEventInDB(event) {
        const transaction = db.transaction(['events'], 'readwrite');
        const objectStore = transaction.objectStore('events');

        // Convertir l'ID en nombre si nécessaire
        const eventId = Number(event.id);

        // Obtenir l'événement existant dans IndexedDB
        const getRequest = objectStore.get(eventId);

        getRequest.onsuccess = () => {
            const existingEvent = getRequest.result;

            if (existingEvent) {
                // Mettre à jour l'événement existant avec les nouvelles données
                existingEvent.title = event.title;
                existingEvent.desc = event.desc;
                existingEvent.start = event.start;
                existingEvent.end = event.end;
                existingEvent.color = event.color;

                // Utiliser put() avec l'objet existingEvent pour mettre à jour l'événement existant
                const updateRequest = objectStore.put(existingEvent);

                updateRequest.onsuccess = () => {
                    console.log('Event updated in IndexedDB');
                    loadEventsFromDB(); // Recharger les événements après la mise à jour
                };

                updateRequest.onerror = () => {
                    console.error('Error updating event in IndexedDB');
                };
            } else {
                console.error('Event with ID', eventId, 'not found in IndexedDB');
            }
        };

        getRequest.onerror = () => {
            console.error('Error getting event from IndexedDB');
        };
    }


    function handleAddOrUpdateEvent(event) {
        console.log('test')
        // Vérifier si l'événement existe déjà (s'il a un ID défini)
        if (event.id !== undefined && event.id !== null) {
            updateEventInDB(event); // Mettre à jour l'événement existant
        } else {
            addEventToDB(event); // Ajouter un nouvel événement
        }

        // Mettre à jour l'affichage dans le calendrier
        calendar.refetchEvents();
    }
});
