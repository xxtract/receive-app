import { ConfigLoader } from './services/config-loader.js';
import { ServiceChecker } from './services/service-checker.js';
import { ProductTable } from './product/product-table.js';
import { ProductSearch } from './product/product-search.js';
import { ExcelExport } from './product/excel-export.js';
import { showAlert } from './utils.js';

export class ProductManagement {
    constructor(config) {
        this.gtinSearchInput = config.gtinSearchInput;
        this.onProductsChanged = config.onProductsChanged || (() => {});
        this.onGtinScanned = config.onGtinScanned || (() => {});
        this.onReceptionReady = config.onReceptionReady || (() => {});
        this.onConfigLoaded = config.onConfigLoaded || (() => {});

        // Initialize config loader
        this.configLoader = new ConfigLoader(config.apiBaseUrl);

        // Use the provided ServiceChecker instance
        this.serviceChecker = config.serviceChecker;

        // Initialize JSON structure for storing product data
        this.productData = {};

        // Store the selected company's data
        this.selectedCompanyGLN = null;
        this.selectedCompany = null;

        // Initialize product table
        this.productTable = new ProductTable({
            productTableContainer: config.productTableContainer,
            productTableBody: config.productTableBody,
            gtinSearchInput: this.gtinSearchInput,
            serviceChecker: this.serviceChecker,
            labelPrinterApiUrl: config.labelPrinterApiUrl,
            onProductsChanged: (source, count) => {
                this.onProductsChanged(source, count);
                this.highlightNewRows(count);
            },
            onProductAdded: this.addProductToJson.bind(this),
            onProductRemoved: this.removeProductFromJson.bind(this),
            onReceptionReady: this.onReceptionReady.bind(this)
        });

        // Initialize product search
        this.productSearch = new ProductSearch({
            apiBaseUrl: config.apiBaseUrl,
            gtinSearchInput: this.gtinSearchInput,
            gtinSearchSpinner: config.gtinSearchSpinner,
            productTable: this.productTable,
            serviceChecker: this.serviceChecker,
            onGtinScanned: this.onGtinScanned
        });

        // Initialize excel export
        this.excelExport = new ExcelExport({
            productTableContainer: config.productTableContainer,
            productTableBody: config.productTableBody
        });

        this.loadConfig();
    }

    async handleReceptionReady() {
        console.log('handleReceptionReady called in ProductManagement');
        const products = this.collectProductData();
        console.log('Collected products:', products);
        if (products.length > 0) {
            try {
                console.log('Calling onReceptionReady with products');
                this.onReceptionReady(products);
            } catch (error) {
                console.error('Error in handleReceptionReady:', error);
                showAlert('Er is een fout opgetreden bij het voorbereiden van de ontvangst.', 'error');
            }
        } else {
            console.log('No products to process');
            showAlert('Er zijn geen producten om te verwerken.', 'error');
        }
    }

    collectProductData() {
        return this.productTable.collectProductData();
    }

    highlightNewRows(count) {
        const rows = this.productTable.productTableBody.querySelectorAll('tr');
        const newRows = Array.from(rows).slice(0, count);
        newRows.forEach(row => {
            row.classList.add('highlight-new');
            setTimeout(() => {
                row.classList.remove('highlight-new');
            }, 2000);
        });
    }

    async loadConfig() {
        try {
            const config = await this.configLoader.loadConfig();
            if (config && config.servicesApiUrl) {
                console.log('Loaded services API URL:', config.servicesApiUrl);
                // Update the ServiceChecker with the new API URL
                this.updateServiceChecker(config);
                // Call the onConfigLoaded callback in the App class
                if (typeof this.onConfigLoaded === 'function') {
                    this.onConfigLoaded(config);
                }
            } else {
                throw new Error('Services API URL not found in config');
            }
        } catch (error) {
            console.error('Error loading config:', error);
            this.handleConfigError(error);
        }
    }

    updateServiceChecker(config) {
        this.serviceChecker = new ServiceChecker({
            apiBaseUrl: config.apiBaseUrl,
            servicesApiUrl: config.servicesApiUrl,
            modalManager: this.modalManager
        });
        // Update ServiceChecker in ProductTable and ProductSearch
        this.productTable.updateServiceChecker(this.serviceChecker);
        this.productSearch.updateServiceChecker(this.serviceChecker);
    }

    handleConfigError(error) {
        let errorMessage = 'Er is een fout opgetreden bij het laden van de configuratie. ';
        if (error.message.includes('API URL not found')) {
            errorMessage += 'De services API URL ontbreekt in de configuratie.';
        } else if (error.name === 'NetworkError') {
            errorMessage += 'Controleer uw internetverbinding en probeer het opnieuw.';
        } else {
            errorMessage += 'Probeer de pagina te vernieuwen of neem contact op met de beheerder.';
        }
        showAlert(errorMessage, 'error');
    }

    setSelectedCompany(company) {
        console.log('setSelectedCompany called with:', company);
        try {
            if (company === null) {
                // Clear selection
                console.log('Clearing company selection');
                this.productTable.setSelectedCompany(null);
                this.productSearch.setSelectedCompany(null);
                this.excelExport.setSelectedCompany(null);
                this.selectedCompanyGLN = null;
                this.selectedCompany = null;
            } else {
                console.log('Setting new company:', company.companyName);
                this.productTable.setSelectedCompany(company);
                this.productSearch.setSelectedCompany(company);
                this.excelExport.setSelectedCompany(company);
                // Store the complete company object with all properties
                this.selectedCompany = {
                    companyName: company.companyName,
                    informationProvider: company.informationProvider || company.gln,
                    gln: company.informationProvider || company.gln,
                    finishCode: company.finishCode
                };
                this.selectedCompanyGLN = company.informationProvider || company.gln;
                console.log('Selected company with finishCode:', this.selectedCompany);
            }
            
            if (Object.keys(this.productData).length > 0) {
                console.log('Resetting product data');
                this.productData = {}; // Reset product data only if it's not empty
                console.log('Product data reset:', this.productData);
            } else {
                console.log('Product data already empty, skipping reset');
            }
            console.log('Selected company GLN:', this.selectedCompanyGLN);
            
            // Clear the product table
            console.log('Clearing product table');
            this.clearProducts();
        } catch (error) {
            console.error('Error setting selected company:', error);
            showAlert('Er is een fout opgetreden bij het instellen van het geselecteerde bedrijf.', 'error');
        }
    }

    clearProducts() {
        console.log('clearProducts called in ProductManagement');
        try {
            if (this.productTable && typeof this.productTable.clearProducts === 'function') {
                this.productTable.clearProducts();
                console.log('ProductTable clearProducts method called');
            } else {
                console.error('ProductTable clearProducts method not found');
            }
            if (this.gtinSearchInput) {
                this.gtinSearchInput.focus();
                console.log('GTIN search input focused');
            }
            this.onProductsChanged();
            this.productData = {}; // Reset product data when clearing products
            console.log('Product data reset:', this.productData);
        } catch (error) {
            console.error('Error clearing products:', error);
            showAlert('Er is een fout opgetreden bij het wissen van de producten.', 'error');
        }
    }

    deleteGtin(gtin) {
        try {
            this.productTable.deleteGtin(gtin);
            this.gtinSearchInput.focus();
            this.onProductsChanged();
        } catch (error) {
            console.error('Error deleting GTIN:', error);
            showAlert('Er is een fout opgetreden bij het verwijderen van het product.', 'error');
        }
    }

    addProductToJson(product) {
        this.productData[product.globalTradeItemNumber] = {
            tradeItemId: product.tradeItemId || null,
            informationProvider: this.selectedCompanyGLN,
            globalTradeItemNumber: product.globalTradeItemNumber,
            productDescription: product.productDescription,
            tradeItemUnitDescriptor: product.tradeItemUnitDescriptor || null,
            productType: product.productType,
            serviceMeasure: product.activeService?.includes('measure') || false,
            servicePackshot: product.activeService?.includes('packshot') || false,
            serviceLabelImage: product.activeService?.includes('labelimage') || false,
            servicePackInfo: product.activeService?.includes('packinfo') || false,
            finishCode: this.selectedCompany?.finishCode || null
        };
        console.log('Updated product data:', this.productData);
    }

    removeProductFromJson(gtin) {
        delete this.productData[gtin];
        console.log('Updated product data:', this.productData);
    }
}
