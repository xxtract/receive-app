import { showAlert, highlightRow } from '../utils.js';
import { MeasureService } from '../services/measure-service.js';
import { ServiceChecker } from '../services/service-checker.js';

export class ProductTable {
    constructor(config) {
        this.productTableContainer = config.productTableContainer;
        this.productTableBody = config.productTableBody;
        this.productCounter = document.getElementById('productCounter');
        this.productCount = 0;
        this.selectedCompany = null;
        this.beepSound = new Audio('/sounds/beep.wav');
        this.heConfirmSound = new Audio('/sounds/HE_confirm.wav');
        this.ceConfirmSound = new Audio('/sounds/CE_confirm.wav');
        this.onProductsChanged = config.onProductsChanged || ((source) => {});
        this.serviceChecker = config.serviceChecker;
        this.receptionReadyBtn = document.getElementById('receptionReadyBtn');
        this.onProductAdded = config.onProductAdded || (() => {});
        this.onProductRemoved = config.onProductRemoved || (() => {});
        this.API_BASE_URL = config.apiBaseUrl || 'http://catalog.xxtract.test/api';
        this.LABELPRINTER_API_URL = config.labelPrinterApiUrl || 'http://labelprint.xxtract.test/api/inbound';
        this.onReceptionReady = config.onReceptionReady || (() => {
            console.error('onReceptionReady is not defined');
        });
        this.initializeEventListeners();
    }

    updateServiceChecker(newServiceChecker) {
        console.log('Updating ServiceChecker in ProductTable');
        this.serviceChecker = newServiceChecker;
    }

    initializeEventListeners() {
        // Handle printer icon clicks
        this.productTableBody.addEventListener('click', (e) => {
            const printerIcon = e.target.closest('.service-icon[data-service="print"]');
            if (printerIcon) {
                const row = printerIcon.closest('tr');
                if (row) {
                    this.handlePrintLabel(row);
                }
            }
        });

        // Handle package layer selection changes
        this.productTableBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('package-layer-select')) {
                const row = e.target.closest('tr');
                if (row) {
                    const selectedValue = e.target.value;
                    
                    // Update product type based on package layer selection
                    const productTypeSelect = row.querySelector('.product-type-select');
                    if (productTypeSelect) {
                        if (selectedValue === 'basiseenheid') {
                            productTypeSelect.value = 'CE';
                        } else if (selectedValue === 'tussenverpakking' || selectedValue === 'omdoos') {
                            productTypeSelect.value = 'HE';
                        }
                    }
                    
                    // Only update text content if it's a product with an order
                    const tradeItemUnitDescriptorCell = row.querySelector('td:nth-child(5)');
                    if (tradeItemUnitDescriptorCell && !row.classList.contains('unrecognized-gtin')) {
                        tradeItemUnitDescriptorCell.textContent = selectedValue;
                    }
                    
                    // Update JSON structure
                    this.updateProductInJson(row);

                    // If package layer is changed to 'omdoos', print label
                    if (selectedValue === 'omdoos') {
                        this.handlePrintLabel(row);
                    }
                }
            }

            // Check required fields after any dropdown change
            this.updateExcelButtonState();
            this.onProductsChanged();
        });

        // Handle "Ontvangst gereed" button click
        if (this.receptionReadyBtn) {
            this.receptionReadyBtn.addEventListener('click', () => this.handleReceptionReady());
        }

        // Initial check for required fields
        this.updateExcelButtonState();
    }

    getHierarchyServices(hierarchyId) {
        // Get all rows with the same hierarchyId
        const rows = Array.from(this.productTableBody.querySelectorAll(`tr[data-hierarchy-id="${hierarchyId}"]`));
        
        // Initialize service flags
        let hasPackshot = false;
        let hasLabelImage = false;
        let hasPackInfo = false;

        // Check each row's services
        rows.forEach(row => {
            const activeServices = this.getActiveServices(row);
            hasPackshot = hasPackshot || activeServices.includes('packshot');
            hasLabelImage = hasLabelImage || activeServices.includes('labelimage');
            hasPackInfo = hasPackInfo || activeServices.includes('packinfo');
        });

        return {
            servicePackshot: hasPackshot,
            serviceLabelImage: hasLabelImage,
            servicePackaging: hasPackInfo
        };
    }

    async handlePrintLabel(row) {
        const gtin = row.dataset.gtin;
        const hierarchyId = row.dataset.hierarchyId;
        const productTypeCell = row.querySelector('td:nth-child(7)');
        const productType = productTypeCell ? productTypeCell.textContent.trim() : '';
        const productDescriptionCell = row.querySelector('td:nth-child(4)');
        const productDescription = productDescriptionCell ? productDescriptionCell.textContent.trim() : '';

        // Get combined services for the hierarchy
        const hierarchyServices = this.getHierarchyServices(hierarchyId);

        try {
            const response = await fetch(this.LABELPRINTER_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    printerId: "Z1",
                    template: "INBOUND",
                    companyName: this.selectedCompany?.companyName || '',
                    informationProvider: this.selectedCompany?.gln || '',
                    globalTradeItemNumber: gtin,
                    productType: productType,
                    servicePackshot: hierarchyServices.servicePackshot,
                    serviceLabelImage: hierarchyServices.serviceLabelImage,
                    servicePackaging: hierarchyServices.servicePackaging,
                    finishCode: this.selectedCompany?.finishCode || null
                })
            });

            if (!response.ok) {
                if (response.status === 500 || response.status === 503 || response.status === 504) {
                    throw new Error('printer_unavailable');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            showAlert('Label wordt geprint', true);
        } catch (error) {
            console.error('Error printing label:', error);
            if (error.message === 'printer_unavailable' || error.message.includes('Failed to fetch')) {
                showAlert('De printer is niet beschikbaar. Controleer de verbinding met de printer.', false);
            } else {
                showAlert('Er is een fout opgetreden bij het printen van het label', false);
            }
        }
    }

    updateProductInJson(row) {
        const product = {
            globalTradeItemNumber: row.dataset.gtin,
            productDescription: row.querySelector('td:nth-child(4)').textContent,
            tradeItemUnitDescriptor: row.querySelector('td:nth-child(5)').textContent,
            productType: row.querySelector('.product-type-select').value,
            activeService: JSON.parse(row.querySelector('.services-cell').dataset.activeService),
            tradeItemId: row.dataset.tradeItemId || null
        };
        console.log('Updating product in JSON:', product);
        this.onProductAdded(product);
    }

    async handleReceptionReady() {
        console.log('handleReceptionReady called');
        console.log('Current product table content:', this.productTableBody.innerHTML);

        // Check if all required fields are filled
        const requiredFields = Array.from(this.productTableBody.querySelectorAll('select[required]'));
        console.log('Required fields:', requiredFields);
        const hasEmptyRequiredFields = requiredFields.some(select => !select.value);

        if (hasEmptyRequiredFields) {
            console.warn('Empty required fields detected');
            showAlert('Vul alle verplichte velden in voordat u de ontvangst afrondt.', false);
            return;
        }

        // Collect all product data
        const products = this.collectProductData();
        console.log('Products collected for reception:', products);

        // Additional validation
        const invalidProducts = products.filter(product =>
            !product.globalTradeItemNumber ||
            !product.informationProvider ||
            !product.productType
        );

        if (invalidProducts.length > 0) {
            console.error('Invalid products:', invalidProducts);
            showAlert('Er zijn ongeldige producten. Controleer de console voor details.', false);
            return;
        }

        if (products.length === 0) {
            console.warn('No valid products to process');
            console.log('Product table rows:', Array.from(this.productTableBody.querySelectorAll('tr')).map(row => row.outerHTML));
            showAlert('Er zijn geen geldige producten om te verwerken.', false);
            return;
        }

        console.log('Valid products ready for reception:', products.length);
        console.log('Product details:', products);

        // Trigger the modal display in the App class
        if (typeof this.onReceptionReady === 'function') {
            console.log('Calling onReceptionReady');
            this.onReceptionReady(products);
        } else {
            console.error('onReceptionReady is not defined');
        }
    }

    async confirmReception(products) {
        console.log('confirmReception called with products:', products);
        const measureService = new MeasureService({ apiBaseUrl: this.API_BASE_URL });

        for (const product of products) {
            try {
                console.log(`Updating MEASURE service status for product: ${product.globalTradeItemNumber}`);
                await measureService.updateMeasureStatus(product.tradeItemId, 'received');
                console.log(`MEASURE service status updated successfully for product: ${product.globalTradeItemNumber}`);
            } catch (error) {
                console.error(`Error updating MEASURE service status for product ${product.globalTradeItemNumber}:`, error);
                showAlert(`Er is een fout opgetreden bij het bijwerken van de MEASURE service status voor product ${product.globalTradeItemNumber}.`);
            }
        }
        console.log('confirmReception completed');
    }

    collectProductData() {
        const products = Array.from(this.productTableBody.querySelectorAll('tr')).map(row => {
            const gtin = row.dataset.gtin?.trim();
            const productTypeCell = row.querySelector('td:nth-child(7)');
            const productType = productTypeCell ? productTypeCell.textContent.trim() : '';
            const activeServices = this.getActiveServices(row);
            const productDescriptionCell = row.querySelector('td:nth-child(4)');
            const productDescription = productDescriptionCell ? productDescriptionCell.textContent.trim() : '';

            console.log('Collecting data for row:', row.outerHTML);
            console.log('GTIN:', gtin, 'Product Type:', productType, 'Product Description:', productDescription);

            // Skip products without a valid GTIN or product type
            if (!gtin || !productType || productType === '-' || productType.includes('selecteer')) {
                console.warn('Skipping product due to missing required elements:', {
                    gtin,
                    productType,
                    productDescription,
                    row: row.outerHTML
                });
                return null;
            }

            const product = {
                globalTradeItemNumber: gtin,
                informationProvider: (this.selectedCompany?.gln || '').trim(),
                productType: productType,
                productDescription: productDescription,
                serviceLabelImage: activeServices.includes('packshot') || activeServices.includes('labelimage'),
                servicePackInfo: activeServices.includes('packinfo'),
                servicePackshot: activeServices.includes('measure') || activeServices.includes('auditlog'),
                serviceMeasure: activeServices.includes('measure'),
                dateTime: new Date().toISOString(),
                tradeItemId: row.dataset.tradeItemId === "" ? "null" : (row.dataset.tradeItemId || "null"),
                finishCode: this.selectedCompany?.finishCode || null,
                orderNumber: row.dataset.orderNumber || null
            };

            // Ensure boolean values are sent as booleans, not strings
            const finalProduct = {
                ...product,
                serviceLabelImage: Boolean(product.serviceLabelImage),
                servicePackInfo: Boolean(product.servicePackInfo),
                servicePackshot: Boolean(product.servicePackshot),
                serviceMeasure: Boolean(product.serviceMeasure)
            };
            console.log('Collected product data:', finalProduct);
            return finalProduct;
        }).filter(product => product !== null);

        console.log('Total products collected:', products.length);
        return products;
    }

    updateExcelButtonState() {
        const excelDownloadBtn = document.getElementById('excelDownloadBtn');
        if (!excelDownloadBtn) return;

        // Check if any required fields are empty
        const hasEmptyRequiredFields = Array.from(this.productTableBody.querySelectorAll('select[required]'))
            .some(select => !select.value);

        if (hasEmptyRequiredFields || this.productCount === 0) {
            excelDownloadBtn.classList.add('disabled');
        } else {
            excelDownloadBtn.classList.remove('disabled');
        }

        this.updateReceptionReadyButtonState();
    }

    updateReceptionReadyButtonState() {
        if (!this.receptionReadyBtn) return;

        // Check if any required fields are empty
        const hasEmptyRequiredFields = Array.from(this.productTableBody.querySelectorAll('select[required]'))
            .some(select => !select.value);

        if (this.productCount === 0 || hasEmptyRequiredFields) {
            this.receptionReadyBtn.classList.add('disabled');
        } else {
            this.receptionReadyBtn.classList.remove('disabled');
        }
    }

    setSelectedCompany(company) {
        this.selectedCompany = company;
        // Reset and show counter when company is selected
        this.productCount = 0;
        this.updateCounter();
        this.productCounter.style.display = 'block';
        this.updateReceptionReadyButtonState();
    }

    updateCounter() {
        this.productCounter.value = this.productCount;
        this.updateReceptionReadyButtonState();
    }

    isGtinInTable(gtin) {
        const gtinCells = this.productTableBody.querySelectorAll('.gtin-cell');
        for (const cell of gtinCells) {
            if (cell.textContent.trim() === gtin) {
                return cell.parentElement; // Return the row element
            }
        }
        return null;
    }

    playBeepSound() {
        if (typeof window !== 'undefined' && window.Audio) {
            this.beepSound.play().catch(error => {
                console.error('Error playing beep sound:', error);
            });
        }
    }

    playHeConfirmSound() {
        if (typeof window !== 'undefined' && window.Audio) {
            this.heConfirmSound.play().catch(error => {
                console.error('Error playing HE confirm sound:', error);
            });
        }
    }

    playCeConfirmSound() {
        if (typeof window !== 'undefined' && window.Audio) {
            this.ceConfirmSound.play().catch(error => {
                console.error('Error playing CE confirm sound:', error);
            });
        }
    }

    displayUnrecognizedGtin(gtin) {
        this.playBeepSound();
        const row = document.createElement('tr');
        row.className = 'product-group unrecognized-gtin';
        row.dataset.gtin = gtin;
        row.dataset.tradeItemId = null;  // Explicitly set tradeItemId to null for unrecognized GTINs
        
        const packageLayerSelect = `
            <select class="package-layer-select table-dropdown" required autofocus>
                <option value="" disabled selected>selecteer</option>
                <option value="basiseenheid">basis eenheid</option>
                <option value="tussenverpakking">tussenverpakking</option>
                <option value="omdoos">omdoos</option>
            </select>
        `;

        // Add event listener for package layer changes
        row.addEventListener('change', (e) => {
            if (e.target.classList.contains('package-layer-select')) {
                const selectedValue = e.target.value;
                const productTypeSelect = row.querySelector('.product-type-select');
                if (productTypeSelect) {
                    if (selectedValue === 'basiseenheid') {
                        productTypeSelect.value = 'CE';
                    } else if (selectedValue === 'tussenverpakking' || selectedValue === 'omdoos') {
                        productTypeSelect.value = 'HE';
                    }
                }
            }
        });

        const productTypeSelect = `
            <select class="product-type-select table-dropdown" required>
                <option value="" disabled selected>selecteer</option>
                <option value="CE">CE</option>
                <option value="HE">HE</option>
            </select>
        `;

        const serviceIcons = `
            <span class="service-icon" data-service="packshot" title="Foto">
                <i class="mdi mdi-camera"></i>
            </span>
            <span class="service-icon" data-service="packinfo" title="Verpakking">
                <i class="mdi mdi-package-variant-closed"></i>
            </span>
        `;

        row.innerHTML = `
            <td onclick="window.showDeleteConfirmation('${gtin}', '-')">
                <svg class="trash-icon" viewBox="0 0 24 24">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </td>
            <td class="bracket-cell"></td>
            <td class="gtin-cell" onclick="window.copyGTIN('${gtin}')" title="Klik om GTIN te kopiëren">
                ${gtin}
            </td>
            <td>-</td>
            <td class="package-layer-cell">${packageLayerSelect}</td>
            <td>-</td>
            <td class="product-type-cell">${productTypeSelect}</td>
            <td class="services-cell" data-active-service='[]'>${serviceIcons}</td>
            <td>
                <span class="service-icon" data-service="print" title="Print label">
                    <i class="mdi mdi-printer"></i>
                </span>
            </td>
        `;
        
        // Insert at the beginning of the table
        if (this.productTableBody.firstChild) {
            this.productTableBody.insertBefore(row, this.productTableBody.firstChild);
        } else {
            this.productTableBody.appendChild(row);
        }
        
        // Focus and open the dropdown
        const select = row.querySelector('.package-layer-select');
        select.focus();
        
        this.productTableContainer.style.display = 'block';
        this.productCount += 1;
        this.updateCounter();

        // Update Excel button state after adding new row
        this.updateExcelButtonState();
        this.updateReceptionReadyButtonState();
        this.onProductsChanged();

        // Add to JSON structure
        this.onProductAdded({
            globalTradeItemNumber: gtin,
            productDescription: '-',
            productType: '',
            activeService: []
        });
    }

    // Note for developers:
    // The 'source' parameter in the displayProducts method indicates where the product was found.
    // If source === 'tblproducts', do not make the API call for retrieving the service.
    // Example usage in the calling code:
    // if (response.source !== 'tblproducts') {
    //     // Make API call for retrieving the service
    // }
    displayProducts(products, source) {
        console.log('Displaying products:', products);
        if (products.length === 0) {
            console.log('No products to display');
            this.onProductsChanged(source, 0);
            this.updateReceptionReadyButtonState();
            return;
        }

        // Group products by hierarchyId
        const groupedProducts = {};
        products.forEach(product => {
            if (!groupedProducts[product.hierarchyId]) {
                groupedProducts[product.hierarchyId] = [];
            }
            groupedProducts[product.hierarchyId].push(product);
        });

        // Create document fragment for new rows
        const fragment = document.createDocumentFragment();

        // Add products to fragment with grouping brackets
        Object.values(groupedProducts).forEach(group => {
            // Play appropriate sound based on group size
            if (group.length > 1) {
                this.playHeConfirmSound();
            } else {
                this.playCeConfirmSound();
            }
            
            group.forEach((product, index) => {
                const row = document.createElement('tr');
                row.className = 'product-group';
                row.dataset.gtin = product.globalTradeItemNumber;
                row.dataset.hierarchyId = product.hierarchyId;  // Changed from product.id
                row.dataset.tradeItemId = product.tradeItemId;  // This comes from ti_other.id in the query
                row.dataset.orderNumber = product.orderNumber || '';  // Add orderNumber to dataset
                row.dataset.source = source;  // Add source information
                
                // Debug log to check the values
                console.log('Product data for row:', {
                    gtin: product.globalTradeItemNumber,
                    hierarchyId: product.hierarchyId,
                    tradeItemId: product.tradeItemId
                });
                
                console.log(`Creating row for GTIN ${product.globalTradeItemNumber}`);
                
                // Add bracket cell
                let bracketClass = '';
                if (group.length > 1) {
                    if (index === 0) bracketClass = 'bracket bracket-top';
                    else if (index === group.length - 1) bracketClass = 'bracket bracket-bottom';
                    else bracketClass = 'bracket bracket-middle';
                }
                
                row.innerHTML = this.createProductRowHtml(product, bracketClass);
                fragment.appendChild(row);

                // Add to JSON structure with explicit tradeItemId
                const productForJson = {
                    ...product,
                    tradeItemId: product.tradeItemId  // Ensure tradeItemId is included
                };
                console.log('Adding product to JSON structure:', productForJson);
                this.onProductAdded(productForJson);
            });
        });

        // Insert fragment at the beginning of the table
        if (this.productTableBody.firstChild) {
            this.productTableBody.insertBefore(fragment, this.productTableBody.firstChild);
        } else {
            this.productTableBody.appendChild(fragment);
        }
        
        this.productTableContainer.style.display = 'block';
        this.productCount += products.length;
        this.updateCounter();
        this.updateExcelButtonState();
        this.updateReceptionReadyButtonState();
        this.onProductsChanged(source, products.length);

        // Update service icons after adding rows to the DOM
        console.log('Updating service icons for all products');
        products.forEach(product => {
            if (product.activeService) {
                this.updateServiceIcons(product.globalTradeItemNumber, product.activeService);

                // If product is an 'omdoos', print label automatically
                if (product.tradeItemUnitDescriptor === 'omdoos') {
                    const row = this.productTableBody.querySelector(`tr[data-gtin="${product.globalTradeItemNumber}"]`);
                    if (row) {
                        this.handlePrintLabel(row);
                    }
                }
            }
        });
    }

    createProductRowHtml(product, bracketClass) {
        const serviceIcons = `
            <span class="service-icon" data-service="packshot" title="Foto">
                <i class="mdi mdi-camera"></i>
            </span>
            <span class="service-icon" data-service="packinfo" title="Verpakking">
                <i class="mdi mdi-package-variant-closed"></i>
            </span>
        `;

        return `
            <td onclick="console.log('Trash icon clicked for GTIN:', '${product.globalTradeItemNumber}'); window.showDeleteConfirmation('${product.globalTradeItemNumber}', '${(product.productDescription || '-').replace(/'/g, "\\'")}')">
                <svg class="trash-icon" viewBox="0 0 24 24">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </td>
            <td class="bracket-cell">
                ${bracketClass ? `<div class="${bracketClass}"></div>` : ''}
            </td>
            <td class="gtin-cell" onclick="window.copyGTIN('${product.globalTradeItemNumber}')" title="Klik om GTIN te kopiëren">
                ${product.globalTradeItemNumber}
            </td>
            <td>${product.productDescription || '-'}</td>
            <td>${product.tradeItemUnitDescriptor && product.tradeItemUnitDescriptor !== '' ? product.tradeItemUnitDescriptor : '-'}</td>
            <td>${product.quantityOfChildren && product.quantityOfChildren !== '' ? product.quantityOfChildren : '-'}</td>
            <td>${product.productType || '-'}</td>
            <td class="services-cell" data-active-service='${JSON.stringify(product.activeService || [])}'>${serviceIcons}</td>
            <td>
                <span class="service-icon" data-service="print" title="Print label">
                    <i class="mdi mdi-printer"></i>
                </span>
            </td>
        `;
    }

    updateServiceIcons(gtin, activeServices) {
        console.log(`Updating service icons for GTIN ${gtin}. Active services:`, activeServices);
        const row = this.productTableBody.querySelector(`tr[data-gtin="${gtin}"]`);
        if (row) {
            console.log(`Found row for GTIN ${gtin}`);
            const servicesCell = row.querySelector('.services-cell');
            if (servicesCell) {
                console.log(`Found services cell for GTIN ${gtin}`);
                const icons = servicesCell.querySelectorAll('.service-icon');
                icons.forEach(icon => {
                    const service = icon.dataset.service;
                    console.log(`Checking service: ${service}`);
                    const isActive = activeServices.includes(service) ||
                        (service === 'measure' && activeServices.includes('auditlog')) ||
                        (service === 'packshot' && activeServices.includes('labelimage'));
                    
                    if (isActive) {
                        console.log(`Activating icon for service: ${service}`);
                        icon.classList.add('active');
                    } else {
                        console.log(`Deactivating icon for service: ${service}`);
                        icon.classList.remove('active');
                    }
                });
                servicesCell.dataset.activeService = JSON.stringify(activeServices);
                console.log(`Updated service icons for GTIN ${gtin}. Active services:`, activeServices);
            } else {
                console.log(`Services cell not found for GTIN ${gtin}`);
            }
        } else {
            console.log(`Row not found for GTIN ${gtin}`);
        }
    }

    getActiveServices(row) {
        const servicesCell = row.querySelector('.services-cell');
        if (servicesCell) {
            const activeIcons = servicesCell.querySelectorAll('.service-icon.active');
            const activeServices = Array.from(activeIcons).map(icon => icon.dataset.service);
            console.log('Active services for row:', activeServices);
            return activeServices;
        }
        console.log('No services cell found for row');
        return [];
    }

    deleteGtin(gtin) {
        const rows = this.productTableBody.getElementsByTagName('tr');
        let hierarchyId = null;
        let hierarchyRows = [];
        
        // Find all rows with the same hierarchyId
        for (let row of rows) {
            if (row.dataset.gtin === gtin) {
                hierarchyId = row.dataset.hierarchyId;
                break;
            }
        }

        if (hierarchyId) {
            for (let row of rows) {
                if (row.dataset.hierarchyId === hierarchyId) {
                    hierarchyRows.push(row);
                }
            }
        }

        // If only one row in hierarchy, remove bracket
        if (hierarchyRows.length === 2) {
            hierarchyRows.forEach(row => {
                if (row.dataset.gtin !== gtin) {
                    const bracketCell = row.querySelector('.bracket-cell');
                    bracketCell.innerHTML = '';
                }
            });
        }

        // Remove the row with the specified GTIN
        for (let row of rows) {
            if (row.dataset.gtin === gtin) {
                row.remove();
                this.productCount -= 1;
                this.updateCounter();
                break;
            }
        }

        showAlert('Product verwijderd', true);

        // Update Excel button state after removing row
        this.updateExcelButtonState();
        this.updateReceptionReadyButtonState();
        this.onProductsChanged();

        // Remove from JSON structure
        this.onProductRemoved(gtin);
    }

    clearProducts() {
        console.log('clearProducts called in ProductTable');
        this.productTableBody.innerHTML = '';
        console.log('Product table body cleared');
        this.productTableContainer.style.display = 'none';
        console.log('Product table container hidden');
        this.productCount = 0;
        this.updateCounter();
        console.log('Product count reset and counter updated');
        
        // Update Excel button state after clearing
        this.updateExcelButtonState();
        this.updateReceptionReadyButtonState();
        console.log('Excel and Reception Ready button states updated');

        // Clear JSON structure
        const removedGtins = Array.from(this.productTableBody.querySelectorAll('tr')).map(row => row.dataset.gtin);
        removedGtins.forEach(gtin => {
            this.onProductRemoved(gtin);
            console.log(`Product removed from JSON structure: ${gtin}`);
        });

        this.onProductsChanged();
        console.log('Products changed event triggered');
        console.log('All products cleared successfully');
    }
}
