import { KeyboardNavigation } from './keyboard-navigation.js';
import { CompanySearch } from './company-search.js';
import { ProductManagement } from './product-management.js';
import { ServiceChecker } from './services/service-checker.js';
import { copyToClipboard, showAlert } from './utils.js';

export class App {
    constructor() {
        this.API_BASE_URL = window.location.origin;
        this.selectedCompany = null;
        this.proceedWithSearch = false;
        this.lastScannedGtin = null;
        this.logArray = [];

        this.log('App constructor called - Version 0.0.186');

        // Initialize DOM elements
        this.initializeElements();
        
        // Initialize components asynchronously
        this.initializeComponentsAsync();
        
        // Initialize event listeners
        this.initializeEventListeners();

        // Make necessary functions globally available
        this.exposeGlobalFunctions();

        // Expose log retrieval function
        window.getAppLogs = this.getAppLogs.bind(this);

        // Override default confirm behavior
        this.overrideConfirm();
    }

    async initializeComponentsAsync() {
        try {
            await this.initializeComponents();
        } catch (error) {
            this.log('Error initializing components:', error);
            showAlert('Er is een fout opgetreden bij het initialiseren van de applicatie.', false);
        }
    }

    async initializeComponents() {
        // Initialize keyboard navigation
        this.keyboardNavigation = new KeyboardNavigation(
            this.searchInput,
            this.dropdown,
            this.handleCompanySelect.bind(this),
            this.handleSearch.bind(this)
        );

        // Initialize company search
        this.companySearch = new CompanySearch({
            apiBaseUrl: this.API_BASE_URL,
            searchInput: this.searchInput,
            searchSpinner: this.searchSpinner,
            dropdown: this.dropdown,
            keyboardNavigation: this.keyboardNavigation,
            onCompanySelect: this.handleCompanySelect.bind(this)
        });

        // Fetch configuration from server
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/config`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const config = await response.json();
            this.log('Config loaded:', config);

            // Initialize ServiceChecker with the fetched configuration
            this.serviceChecker = new ServiceChecker({
                apiBaseUrl: this.API_BASE_URL,
                servicesApiUrl: config.servicesApiUrl
            });

            // Initialize product management
            this.productManagement = new ProductManagement({
                apiBaseUrl: this.API_BASE_URL,
                gtinSearchInput: this.gtinSearchInput,
                gtinSearchSpinner: this.gtinSearchSpinner,
                productTableContainer: this.productTableContainer,
                productTableBody: this.productTableBody,
                serviceChecker: this.serviceChecker,
                labelPrinterApiUrl: config.labelPrinterApiUrl,
                onGtinScanned: this.updateLastScannedGtin.bind(this),
                onReceptionReady: this.handleReceptionReady.bind(this),
                onConfigLoaded: this.updateServiceChecker.bind(this)
            });
        } catch (error) {
            this.log('Error fetching config:', error);
            showAlert('Er is een fout opgetreden bij het laden van de configuratie.', false);
        }
    }

    updateServiceChecker(config) {
        this.log('Updating ServiceChecker');
        this.serviceChecker = new ServiceChecker({
            apiBaseUrl: this.API_BASE_URL,
            servicesApiUrl: config.servicesApiUrl
        });
        this.productManagement.updateServiceChecker(this.serviceChecker);
    }

    handleCompanySelect(companyName, informationProvider, finishCode) {
        this.log(`Company selected: ${companyName} (GLN: ${informationProvider}, finishCode: ${finishCode || 'null'})`);
        if (this.selectedCompany && this.productTableBody.children.length > 0) {
            this.showCompanyChangeConfirmModal(companyName, informationProvider, finishCode);
        } else {
            this.confirmCompanyChange(companyName, informationProvider, finishCode);
        }
    }

    showCompanyChangeConfirmModal(companyName, informationProvider, finishCode) {
        this.log('Showing company change confirmation modal');
        if (this.confirmModal) {
            const modalBody = this.confirmModal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.textContent = 'De ontvangst wordt geannuleerd als je een nieuwe bedrijf selecteert. De ingescande producten worden niet opgeslagen. Weet je zeker dat je verder wilt?';
            }
            this.confirmModal.style.display = 'flex';

            const handleConfirm = () => {
                this.hideConfirmModal();
                if (companyName && informationProvider) {
                    this.confirmCompanyChange(companyName, informationProvider, finishCode);
                } else {
                    this.clearCompanySelection();
                }
            };

            const handleCancel = () => {
                this.hideConfirmModal();
            };

            if (this.confirmButton) this.confirmButton.onclick = handleConfirm;
            if (this.cancelButton) this.cancelButton.onclick = handleCancel;
        } else {
            this.log('Error: Confirm modal not found');
            if (companyName && informationProvider) {
                this.confirmCompanyChange(companyName, informationProvider, finishCode);
            } else {
                this.clearCompanySelection();
            }
        }
    }

    hideConfirmModal() {
        if (this.confirmModal) {
            this.confirmModal.style.display = 'none';
            if (this.confirmButton) this.confirmButton.onclick = null;
            if (this.cancelButton) this.cancelButton.onclick = null;
        }
    }

    confirmCompanyChange(companyName, informationProvider, finishCode) {
        this.selectedCompany = {
            companyName,
            informationProvider,
            gln: informationProvider, // Keep gln for backward compatibility
            finishCode: finishCode
        };
        this.log(`Setting selected company with finishCode: ${finishCode}`);
        this.displaySelectedCompany(companyName, informationProvider);
        
        // Update UI elements
        if (this.searchInput) {
            this.searchInput.value = `${companyName} (GLN: ${informationProvider})`;
            this.searchInput.classList.add('display-field');
            this.searchInput.readOnly = true;
        }

        // Show GTIN search box and copy icon
        if (this.gtinSearchBox) this.gtinSearchBox.style.display = 'block';
        if (this.copyIcon) this.copyIcon.style.display = 'block';

        // Focus on GTIN input
        if (this.gtinSearchInput) this.gtinSearchInput.focus();

        // Update product management
        if (this.productManagement && typeof this.productManagement.setSelectedCompany === 'function') {
            this.productManagement.setSelectedCompany(this.selectedCompany);
        } else {
            this.log('Error: productManagement or setSelectedCompany method is undefined');
        }

        // Hide dropdown
        if (this.dropdown) this.dropdown.style.display = 'none';

        this.updateExcelButtonState();
    }

    handleSearch() {
        this.log('Search initiated');
        if (this.companySearch && typeof this.companySearch.handleInput === 'function') {
            this.companySearch.handleInput();
        } else {
            this.log('Error: companySearch or handleInput method is undefined');
        }
    }

    updateLastScannedGtin(gtin) {
        this.lastScannedGtin = gtin;
        if (this.lastScannedGtinElement) {
            this.lastScannedGtinElement.textContent = gtin;
            this.lastScannedGtinElement.style.display = 'inline';
        }
    }

    displaySelectedCompany(companyName, informationProvider) {
        this.log(`Displaying selected company: ${companyName} (GLN: ${informationProvider})`);
        // This method is now handled within handleCompanySelect
    }

    updateExcelButtonState() {
        this.log('Updating Excel button state');
        const hasProducts = this.productTableBody && this.productTableBody.children.length > 0;
        if (this.excelButton) {
            this.excelButton.disabled = !hasProducts;
            this.excelButton.classList.toggle('disabled', !hasProducts);
        }
    }

    initializeEventListeners() {
        this.log('Initializing event listeners');

        // Company search input event listeners
        if (this.searchInput) {
            this.searchInput.addEventListener('click', () => {
                this.log('Company search input clicked');
                if (this.selectedCompany) {
                    if (this.productTableBody && this.productTableBody.children.length > 0) {
                        this.log('Conditions met for showing company change confirm modal');
                        this.showCompanyChangeConfirmModal();
                    } else {
                        this.log('Clearing company selection without confirmation');
                        this.clearCompanySelection();
                    }
                } else {
                    this.log('No company selected, no action needed');
                }
            });

            this.searchInput.addEventListener('input', () => {
                this.log('Company search input changed');
                if (!this.selectedCompany) {
                    this.handleSearch();
                }
            });
        } else {
            this.log('Error: Search input not found');
        }

        // Copy icon event listener
        if (this.copyIcon) {
            this.copyIcon.addEventListener('click', async () => {
                this.log('Copy icon clicked');
                if (this.selectedCompany) {
                    await copyToClipboard(this.selectedCompany.informationProvider, 'GLN nummer gekopieerd naar klembord');
                }
            });
        }

        // Reception Ready button event listener
        if (this.receptionReadyBtn) {
            this.receptionReadyBtn.addEventListener('click', (event) => {
                this.log('Reception Ready button clicked - Event listener triggered');
                event.preventDefault();
                event.stopPropagation();
                this.log('Calling handleReceptionReady on productManagement');
                this.productManagement.handleReceptionReady();
                this.log('handleReceptionReady called');
            });
            this.log('Reception Ready button event listener added');
        } else {
            this.log('Error: Reception Ready button not found, unable to add event listener');
        }
        
        // Log the state of the Reception Ready button
        this.logReceptionReadyButtonState();

        // Reception Ready Confirm button event listener
        if (this.receptionReadyConfirmButton) {
            this.receptionReadyConfirmButton.addEventListener('click', (event) => {
                this.log('Reception Ready Confirm button clicked');
                event.preventDefault();
                event.stopPropagation();
                this.processReception();
            });
            this.log('Reception Ready Confirm button event listener added');
        } else {
            this.log('Error: Reception Ready Confirm button not found, unable to add event listener');
        }

        // Reception Ready Cancel button event listener
        if (this.receptionReadyCancelButton) {
            this.receptionReadyCancelButton.addEventListener('click', (event) => {
                this.log('Reception Ready Cancel button clicked');
                event.preventDefault();
                event.stopPropagation();
                this.hideReceptionReadyModal();
            });
            this.log('Reception Ready Cancel button event listener added');
        } else {
            this.log('Error: Reception Ready Cancel button not found, unable to add event listener');
        }

        this.log('Event listeners initialized');
    }

    logReceptionReadyButtonState() {
        this.log(`Reception Ready button state: ${this.receptionReadyBtn ? 'Found' : 'Not found'}`);
        if (this.receptionReadyBtn) {
            this.log(`Reception Ready button disabled: ${this.receptionReadyBtn.disabled}`);
            this.log(`Reception Ready button classes: ${this.receptionReadyBtn.className}`);
        }
    }

    handleReceptionReady(products) {
        this.log('handleReceptionReady called with products');
        this.logReceptionReadyButtonState();
        if (products.length === 0) {
            this.showInfoModal('Er zijn geen producten om te verwerken.', 'error');
            return;
        }
        this.receptionProducts = products;
        this.showReceptionReadyModal();
    }

    clearCompanySelection() {
        this.log('Clearing company selection');
        this.selectedCompany = null;
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchInput.classList.remove('display-field');
            this.searchInput.readOnly = false;
        }
        if (this.gtinSearchBox) this.gtinSearchBox.style.display = 'none';
        if (this.copyIcon) this.copyIcon.style.display = 'none';
        if (this.productManagement && typeof this.productManagement.setSelectedCompany === 'function') {
            this.productManagement.setSelectedCompany(null);
        }
        // Clear the last scanned GTIN display
        if (this.lastScannedGtinElement) {
            this.lastScannedGtinElement.textContent = '';
            this.lastScannedGtinElement.style.display = 'none';
        }
        this.lastScannedGtin = null;
        this.updateExcelButtonState();
    }

    exposeGlobalFunctions() {
        this.log('Exposing global functions');
        globalThis.copyGTIN = async (gtin) => {
            this.log(`Copying GTIN: ${gtin}`);
            await copyToClipboard(gtin, 'GTIN gekopieerd naar klembord');
        };
        globalThis.showDeleteConfirmation = (gtin, productName) => {
            this.log(`Showing delete confirmation for GTIN: ${gtin}, Product: ${productName}`);
            this.showDeleteConfirmModal(gtin, productName);
        };
    }

    showDeleteConfirmModal(gtin, productName) {
        this.log(`Showing delete confirmation modal for GTIN: ${gtin}, Product: ${productName}`);
        if (this.deleteModal && this.deleteModalBody) {
            this.deleteModalBody.textContent = `Weet u zeker dat u het product "${productName}" (GTIN: ${gtin}) wilt verwijderen?`;
            this.deleteModal.style.display = 'flex';
            
            const handleDelete = () => {
                this.log(`Delete confirmed for GTIN: ${gtin}`);
                this.handleDeleteConfirm(gtin);
                this.hideDeleteConfirmModal();
            };
    
            const handleCancel = () => {
                this.log(`Delete cancelled for GTIN: ${gtin}`);
                this.hideDeleteConfirmModal();
            };
    
            if (this.deleteConfirmButton) this.deleteConfirmButton.onclick = handleDelete;
            if (this.deleteCancelButton) this.deleteCancelButton.onclick = handleCancel;
        } else {
            this.log('Error: Delete modal or modal body not found');
        }
    }

    hideDeleteConfirmModal() {
        this.log('Hiding delete confirmation modal');
        if (this.deleteModal) {
            this.deleteModal.style.display = 'none';
            if (this.deleteConfirmButton) this.deleteConfirmButton.onclick = null;
            if (this.deleteCancelButton) this.deleteCancelButton.onclick = null;
        } else {
            this.log('Error: Delete modal not found');
        }
    }

    handleDeleteConfirm(gtin) {
        this.log(`Handling delete confirmation for GTIN: ${gtin}`);
        if (this.productManagement && typeof this.productManagement.deleteGtin === 'function') {
            this.productManagement.deleteGtin(gtin);
        } else {
            this.log('Error: productManagement or deleteGtin method is undefined');
        }
    }

    overrideConfirm() {
        const originalConfirm = globalThis.confirm;
        globalThis.confirm = (message) => {
            this.log(`Confirm dialog triggered with message: ${message}`);
            this.log(`Stack trace: ${new Error().stack}`);
            // Uncomment the next line to disable the default confirm behavior
            // return true;
            return originalConfirm(message);
        };
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp}: ${message}`;
        console.log(logMessage);
        this.logArray.push(logMessage);
    }

    getAppLogs() {
        return this.logArray.join('\n');
    }

    initializeElements() {
        this.searchInput = document.getElementById('searchTerm');
        this.copyIcon = document.getElementById('copyIcon');
        this.gtinSearchBox = document.getElementById('gtinSearchBox');
        this.gtinSearchInput = document.getElementById('gtinSearch');
        this.productTableContainer = document.getElementById('productTableContainer');
        this.productTableBody = document.getElementById('productTableBody');
        this.dropdown = document.getElementById('companyDropdown');
        this.searchSpinner = document.getElementById('searchSpinner');
        this.gtinSearchSpinner = document.getElementById('gtinSearchSpinner');
        this.excelButton = document.getElementById('excelButton');
        this.lastScannedGtinElement = document.getElementById('lastScannedGtin');
        this.confirmModal = document.getElementById('confirmModal');
        this.cancelButton = document.getElementById('cancelButton');
        this.confirmButton = document.getElementById('confirmButton');
        this.deleteModal = document.getElementById('deleteModal');
        this.deleteModalBody = document.getElementById('deleteModalBody');
        this.deleteCancelButton = document.getElementById('deleteCancelButton');
        this.deleteConfirmButton = document.getElementById('deleteConfirmButton');
        this.receptionReadyBtn = document.getElementById('receptionReadyBtn');
        this.receptionReadyModal = document.getElementById('receptionReadyModal');
        this.receptionReadyCancelButton = document.getElementById('receptionReadyCancelButton');
        this.receptionReadyConfirmButton = document.getElementById('receptionReadyConfirmButton');
        console.log('Confirm modal element:', this.confirmModal);
        console.log('Cancel button element:', this.cancelButton);
        console.log('Confirm button element:', this.confirmButton);
        console.log('Reception Ready button element:', this.receptionReadyBtn);
        console.log('Reception Ready modal element:', this.receptionReadyModal);

        if (!this.confirmModal) console.error('Confirm modal not found');
        if (!this.cancelButton) console.error('Cancel button not found');
        if (!this.confirmButton) console.error('Confirm button not found');
        if (!this.receptionReadyBtn) console.error('Reception Ready button not found');
        if (!this.receptionReadyModal) console.error('Reception Ready modal not found');

        console.log('Elements initialized');
    }

    handleReceptionReady(products) {
        this.log('handleReceptionReady called with products');
        if (products.length === 0) {
            this.showInfoModal('Er zijn geen producten om te verwerken.', 'error');
            return;
        }
        this.receptionProducts = products;
        this.showReceptionReadyModal();
    }

    showReceptionReadyModal() {
        this.log('showReceptionReadyModal called');
        if (this.receptionReadyModal) {
            this.receptionReadyModal.style.display = 'flex';
            this.log('Reception Ready modal displayed');
        } else {
            this.log('Error: Reception Ready modal not found');
        }
    }

    hideReceptionReadyModal() {
        this.log('hideReceptionReadyModal called');
        if (this.receptionReadyModal) {
            this.receptionReadyModal.style.display = 'none';
            this.log('Reception Ready modal hidden');
        } else {
            this.log('Error: Reception Ready modal not found');
        }
    }

    async processReception() {
        this.log('processReception called');
        if (!this.receptionProducts || this.receptionProducts.length === 0) {
            this.log('No products to process');
            showAlert('Er zijn geen producten om te verwerken.', false);
            return;
        }

        this.log(`Processing ${this.receptionProducts.length} products`);
        this.log('Reception products:', JSON.stringify(this.receptionProducts));

        // Add finishCode to each product
        const productsWithFinishCode = this.receptionProducts.map(product => ({
            ...product,
            finishCode: this.selectedCompany.finishCode
        }));

        try {
            this.log('Updating MEASURE service status');
            // First, update MEASURE service status
            await this.productManagement.productTable.confirmReception(productsWithFinishCode);
            this.log('MEASURE service status updated successfully');

            this.log('Sending data to the server');
            // Then, send the data to the server
            const response = await fetch(`${this.API_BASE_URL}/api/process-reception`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productsWithFinishCode),
            });

            const data = await response.json();
            this.log('Reception processed successfully', data);
            
            // Show a success message to the user
            showAlert(`Ontvangst van <strong>${this.selectedCompany.companyName}</strong> verwerkt`, true);
            
            this.log('Clearing product list');
            // Clear the product list
            if (this.productManagement && typeof this.productManagement.clearProducts === 'function') {
                this.productManagement.clearProducts();
            } else {
                this.log('Error: productManagement or clearProducts method is undefined');
            }
            
            this.log('Resetting application state');
            // Reset the application state
            this.clearCompanySelection();
        } catch (error) {
            this.log('Error processing reception', error);
            showAlert('Er is een fout opgetreden bij het verwerken van de ontvangst', false);
        } finally {
            this.log('Hiding Reception Ready modal');
            this.hideReceptionReadyModal();
            this.receptionProducts = null;
        }
    }

}
