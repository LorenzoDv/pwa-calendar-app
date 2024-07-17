if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/pwa-app/service-worker.js')
        .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(error => {
        console.log('Service Worker registration failed:', error);
    });
}


var events = [];
var selectedColor = '#FFFF00';

var calendarEl = document.getElementById('calendar');
var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'fr',
    events: function (info, successCallback, failureCallback) {
        successCallback(events);
    }
});

calendar.render();


const colorSquares = document.querySelectorAll('.color-square');
colorSquares.forEach(square => {
    square.addEventListener('click', function () {
        colorSquares.forEach(sq => sq.classList.remove('selected'));
        square.classList.add('selected');
        selectedColor = square.getAttribute('data-color');
    });
});