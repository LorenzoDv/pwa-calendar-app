document.addEventListener('DOMContentLoaded', function () {
    let db;
    let calendar;  // Variable pour stocker l'instance du calendrier

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

    function addEventToDB(event) {
        const transaction = db.transaction(['events'], 'readwrite');
        const objectStore = transaction.objectStore('events');
        const request = objectStore.add(event);

        request.onsuccess = () => {
            console.log('Event added to IndexedDB');
            loadEventsFromDB();
        };

        request.onerror = () => {
            console.error('Error adding event to IndexedDB');
        };
    }

    function loadEventsFromDB() {
        const transaction = db.transaction(['events'], 'readonly');
        const objectStore = transaction.objectStore('events');
        const request = objectStore.getAll();

        request.onsuccess = event => {
            const events = event.target.result;
            console.log('Events loaded from IndexedDB:', events);
            initializeCalendar(events);
        };

        request.onerror = () => {
            console.error('Error loading events from IndexedDB');
        };
    }

    function initializeCalendar(events) {
        var calendarEl = document.getElementById('calendar');
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'fr',
            events: events,
            selectable: true,
            select: function (info) {
                var fromDate = info.startStr;
                var toDate = info.endStr || info.startStr;

                showModal(fromDate, toDate);
            },
            eventClick: function (info) {
                var event = info.event;

                showModalForEdit(event);
            },
            eventDidMount: function (info) {
                var deleteIcon = document.createElement('span');
                deleteIcon.classList.add('delete-event');
                deleteIcon.innerHTML = '&times;';
                info.el.appendChild(deleteIcon);

                deleteIcon.addEventListener('click', function () {
                    if (confirm("Voulez-vous vraiment supprimer cet événement ?")) {
                        var eventToRemove = info.event;
                        var eventId = eventToRemove.id;

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
                handleAddOrUpdateEvent();
            });
        }
    }

    function showModal(fromDate, toDate) {
        var modal = document.getElementById('eventModal');
        modal.style.display = 'block';

        document.getElementById('fromDate').value = fromDate;
        document.getElementById('toDate').value = toDate;
    }

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
            addButton.addEventListener('click', handleAddOrUpdateEvent);
        }
    }

    document.getElementById('closeModal').addEventListener('click', function () {
        closeModal();
    });

    function removeEventFromDB(eventId) {
        const transaction = db.transaction(['events'], 'readwrite');
        const objectStore = transaction.objectStore('events');
        const request = objectStore.delete(Number(eventId));

        request.onsuccess = () => {
            console.log('Event removed from IndexedDB with ID:', eventId);
            loadEventsFromDB();
        };

        request.onerror = (event) => {
            console.error('Error removing event from IndexedDB', event.target.error);
        };
    }

    function showModalForEdit(event) {
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
        addButton.dataset.eventId = event.id;

        addButton.removeEventListener('click', handleAddOrUpdateEvent);
        addButton.addEventListener('click', function (e) {
            e.preventDefault();
            handleAddOrUpdateEvent(event);
        });
    }

    function updateEventInDB(newEvent, oldEventId) {
        const transaction = db.transaction(['events'], 'readwrite');
        const objectStore = transaction.objectStore('events');

        // Ajouter le nouvel événement
        const addRequest = objectStore.add(newEvent);

        addRequest.onsuccess = () => {
            console.log('Event added to IndexedDB');
            // Supprimer l'ancien événement après l'ajout du nouveau
            removeEventFromDB(oldEventId);
            loadEventsFromDB();
        };

        addRequest.onerror = () => {
            console.error('Error adding event to IndexedDB');
        };
    }

    function handleAddOrUpdateEvent(event) {
        var eventName = document.getElementById('eventName').value;
        var desc = document.getElementById('eventDescription').value;
        var fromDate = document.getElementById('fromDate').value;
        var toDate = document.getElementById('toDate').value;
        var selectedColorSquare = document.querySelector('.color-square.selected');
        var selectedColor = selectedColorSquare ? selectedColorSquare.getAttribute('data-color') : '#000000'; // Default color

        const newEvent = {
            title: eventName,
            desc: desc,
            start: fromDate,
            end: toDate,
            color: selectedColor
        };

        if (event && event.id !== undefined && event.id !== null) {
            // Ajouter le nouvel événement puis supprimer l'ancien
            updateEventInDB(newEvent, event.id);
        } else {
            addEventToDB(newEvent);
        }

        if (calendar) {
            calendar.refetchEvents();
        }

        closeModal();
    }
});
