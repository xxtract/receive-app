// Mock showAlert function for testing
function showAlert(message, success = false) {
    console.log('Alert:', message, success ? '(success)' : '');
}

// Mock highlightRow function for testing
function highlightRow(row, success = false) {
    console.log('Highlight row:', row, success ? '(success)' : '');
}

// Mock copyToClipboard function for testing
async function copyToClipboard(text, successMessage = 'Gekopieerd naar klembord') {
    console.log('Copy to clipboard:', text);
    return Promise.resolve();
}

module.exports = {
    showAlert,
    highlightRow,
    copyToClipboard
};
