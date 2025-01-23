export function showAlert(message, success = false) {
    // Get or create the alert element
    let alert = document.getElementById('alert');
    if (!alert) {
        alert = document.createElement('div');
        alert.id = 'alert';
        document.body.appendChild(alert);
    }

    // Set the alert content and styling
    alert.innerHTML = message;
    alert.className = 'alert' + (success ? ' success' : '');
    alert.style.display = 'block';
    alert.style.animation = 'slideIn 0.3s ease-out';

    // Clear any existing timeout
    if (window.alertTimeout) {
        clearTimeout(window.alertTimeout);
    }

    // Set timeout to hide alert and remove row highlight after 3 seconds
    window.alertTimeout = setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            alert.style.display = 'none';
            if (window.lastHighlightedRow) {
                window.lastHighlightedRow.classList.remove('row-highlight-error', 'row-highlight-success');
                window.lastHighlightedRow = null;
            }
        }, 300);
    }, 3000);
}

export function highlightRow(row, success = false) {
    if (window.lastHighlightedRow) {
        window.lastHighlightedRow.classList.remove('row-highlight-error', 'row-highlight-success');
    }
    row.classList.add(success ? 'row-highlight-success' : 'row-highlight-error');
    window.lastHighlightedRow = row;
}

export async function copyToClipboard(text, successMessage = 'Gekopieerd naar klembord') {
    try {
        await navigator.clipboard.writeText(text);
        showAlert(successMessage, true);
    } catch (err) {
        showAlert('Kon niet kopiëren');
    }
}
