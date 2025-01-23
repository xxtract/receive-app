// Create basic DOM elements needed for tests
document.body.innerHTML = `
  <div id="alert"></div>
  <div id="productCounter"></div>
  <div id="productTableContainer">
    <table id="productTableBody"></table>
  </div>
`;

// Mock window.alert
window.alert = (msg) => console.log('Alert:', msg);

// Mock window.showAlert from utils.js
window.showAlert = (msg) => {
  const alert = document.getElementById('alert');
  alert.textContent = msg;
  console.log('Alert:', msg);
};

// Mock window.highlightRow from utils.js
window.highlightRow = (row, success) => console.log('Highlight row:', row, success ? '(success)' : '(error)');

// Mock window.copyGTIN from utils.js
window.copyGTIN = (text) => console.log('Copy to clipboard:', text);

// Mock window.showDeleteConfirmation from utils.js
window.showDeleteConfirmation = (gtin, description) => console.log('Show delete confirmation:', gtin, description);

// Mock fetch if not in jsdom environment
if (!global.fetch) {
  global.fetch = () => Promise.resolve({
    json: () => Promise.resolve({})
  });
}
