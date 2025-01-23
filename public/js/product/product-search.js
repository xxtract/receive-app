import { showAlert, highlightRow } from '../utils.js';

export class ProductSearch {
    constructor(config) {
        this.API_BASE_URL = config.apiBaseUrl;
        this.gtinSearchInput = config.gtinSearchInput;
        this.gtinSearchSpinner = config.gtinSearchSpinner;
        this.productTable = config.productTable;
        this.serviceChecker = config.serviceChecker;
        this.selectedCompany = null;
        this.onGtinScanned = config.onGtinScanned || (() => {});

        this.initializeEventListeners();
        this.resetBackgroundColor(); // Ensure initial state is correct
    }

    updateServiceChecker(newServiceChecker) {
        console.log('Updating ServiceChecker in ProductSearch');
        this.serviceChecker = newServiceChecker;
    }

    initializeEventListeners() {
        // Handle both Enter and Tab keys for GTIN search
        this.gtinSearchInput.addEventListener('keydown', (e) => {
            console.log('Key pressed:', e.key);
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                console.log('Enter/Tab pressed, searching product...');
                this.searchProduct();
            }
        });

        // Handle focus and blur events for GTIN search input
        this.gtinSearchInput.addEventListener('focus', () => {
            this.changeBackgroundColor();
        });

        this.gtinSearchInput.addEventListener('blur', () => {
            this.resetBackgroundColor();
        });
    }

    changeBackgroundColor() {
        this.gtinSearchInput.style.backgroundColor = 'yellow';
    }

    resetBackgroundColor() {
        this.gtinSearchInput.style.backgroundColor = 'white';
    }

    setSelectedCompany(company) {
        this.selectedCompany = company;
    }

    padGtin(gtin) {
        return gtin.padStart(14, '0');
    }

    async searchProduct() {
        console.log('searchProduct called');
        if (!this.selectedCompany) {
            showAlert('Selecteer eerst een bedrijf');
            this.gtinSearchInput.focus();
            return;
        }

        let gtin = this.gtinSearchInput.value.trim();
        if (!gtin) {
            showAlert('Voer een GTIN in');
            this.gtinSearchInput.focus();
            return;
        }

        // Check if GTIN contains only digits
        if (!/^\d+$/.test(gtin)) {
            showAlert('GTIN mag alleen cijfers bevatten');
            this.gtinSearchInput.value = ''; // Clear the input
            this.gtinSearchInput.focus(); // Set focus back
            return;
        }

        // Pad GTIN with leading zeros to 14 digits
        gtin = this.padGtin(gtin);
        console.log('Searching for GTIN:', gtin);

        // Update the input field with the padded GTIN
        this.gtinSearchInput.value = gtin;

        // Check if GTIN is already in the table
        const existingRow = this.productTable.isGtinInTable(gtin);
        if (existingRow) {
            highlightRow(existingRow, false); // Highlight with error color
            showAlert('Deze GTIN is al gescand');
            this.gtinSearchInput.value = ''; // Clear the input
            this.gtinSearchInput.focus(); // Set focus back
            return;
        }

        this.gtinSearchSpinner.style.display = 'inline-block';

        try {
            console.log('Sending request to server...');
            const response = await fetch(`${this.API_BASE_URL}/api/search-product`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gln: this.selectedCompany.gln,
                    gtin: gtin
                })
            });

            const data = await response.json();
            console.log('Product search response:', data);

            if (data.error) {
                console.error('Server returned an error:', data.error);
                showAlert(data.error);
            } else if (data.found && data.products && data.products.length > 0) {
                console.log(`Product found in ${data.source}. Number of results: ${data.products.length}`);
                
                // Check services for all products in the hierarchy
                const gtins = data.products.map(product => product.globalTradeItemNumber);
                const hierarchyId = data.products[0].hierarchyId; // Assuming all products have the same hierarchyId
                try {
                    const servicesMap = await this.serviceChecker.checkServices(gtins, this.selectedCompany.gln, hierarchyId);
                    console.log('Services checked for GTINs:', servicesMap);
                    
                    // Update the product data with the active service information
                    const productsWithServices = data.products.map(product => ({
                        ...product,
                        activeService: servicesMap[product.globalTradeItemNumber]
                    }));
                    
                    this.productTable.displayProducts(productsWithServices, data.source);
                    this.onGtinScanned(gtin); // Call the callback with the scanned GTIN
                } catch (error) {
                    console.error('Error checking services:', error);
                    showAlert('Er is een fout opgetreden bij het controleren van de diensten');
                }
            } else {
                console.log('No products found for GTIN:', gtin);
                // Product not found in both searches
                this.productTable.displayUnrecognizedGtin(gtin);
                if (data.source === 'none') {
                    showAlert(`Geen bestelling gevonden voor deze GTIN ${gtin}`);
                }
                this.onGtinScanned(gtin); // Call the callback even for unrecognized GTINs
            }
        } catch (error) {
            console.error('Product search error:', error);
            showAlert('Er is een fout opgetreden bij het zoeken van het product');
        } finally {
            this.gtinSearchSpinner.style.display = 'none';
            this.gtinSearchInput.value = ''; // Clear the input after search
            this.gtinSearchInput.focus(); // Always set focus back to the input after search
        }
    }
}
