function toggleMenu() {
    var menuOptions = document.querySelector('.menu-options');
    if (menuOptions.style.display === 'block') {
        menuOptions.style.display = 'none';
    } else {
        menuOptions.style.display = 'block';
    }
}

function handleAgifyFormSubmission() {
    document.getElementById('agifyForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const name = document.getElementById('name').value;
        fetch(`/agifyGuess?name=${encodeURIComponent(name)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('Guess').textContent =
                    `Your age based on the name you gave was: ${data.age}`;
            })
            .catch(error => {
                console.error('Fetch error:', error);
                document.getElementById('Guess').textContent =
                    'Error fetching age data';
            });
    });
}

function fetchAndDisplayHistory() {
    fetch('/AgifyHistory')
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Log In to see History');
                } else {
                    throw new Error('Error fetching history');
                }
            }
            return response.json();
        })
        .then(data => {
            const table = buildHistoryTable(data);
            document.getElementById('HistoryTable').innerHTML = table;
        })
        .catch(error => showError(error.message));
}

// script.js

function clearAgifyHistory() {
    fetch('/clearAgifyHistory', { method: 'POST' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error clearing history');
            }
            return response.text();
        })
        .then(() => {
            document.getElementById('HistoryTable').innerHTML = '';
            showError('History cleared successfully');

        })
        .catch(error => showError(error.message));
}


function buildHistoryTable(data) {
    let table = '<table border=1><tr><th>Name</th><th>Guessed Age</th></tr>';
    
    data.forEach(item => {
        table += `<tr><td>${item.name}</td><td>${item.age}</td></tr>`;
    });

    table += '</table>';
    return table;
}
function showError(message) {
    if (message != null){
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block'; // Make it visible
    }
}

function clearError() {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = '';
    errorElement.style.display = 'none'; // Hide it
}
