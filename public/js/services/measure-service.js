export class MeasureService {
    constructor(config) {
        this.API_BASE_URL = config.apiBaseUrl || 'http://catalog.xxtract.test/api';
        this.fetch = typeof fetch !== 'undefined' ? fetch : global.fetch;
    }

    async checkAndAddAuditMeasurement(product) {
        try {
            if (typeof this.fetch !== 'function') {
                throw new Error('Fetch is not available');
            }

            const url = new URL('/api/checkAndAddAuditMeasurement', this.API_BASE_URL);
            console.log(`Audit measurement endpoint URL: ${url}`);
            const response = await this.fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(product),
            });

            console.log(`Response status for audit measurement: ${response.status}`);

            if (!response) {
                throw new Error('No response received from the server');
            }

            if (response.status === 404) {
                console.error('Audit measurement endpoint not found. Please check the API configuration.');
                return null;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            console.log('Audit measurement result:', result);
            return result;
        } catch (error) {
            console.error('Error in checkAndAddAuditMeasurement:', error);
            console.error('Er is een fout opgetreden bij het controleren en toevoegen van de auditmetingen.');
            return null;
        }
    }

    async updateServiceStatus(tradeItemId, serviceCode, serviceStatus) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/tradeitemservice`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tradeItemId,
                    serviceCode,
                    serviceStatus
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error updating ${serviceCode} service status:`, error);
            console.error(`Er is een fout opgetreden bij het bijwerken van de ${serviceCode} service status.`);
        }
    }

    async updateAllActiveServices(tradeItemId, activeServices) {
        const serviceMap = {
            'packshot': 'PACKSHOT',
            'packinfo': 'PACKINFO',
            'labelimage': 'LABELIMAGE',
            'auditlog': 'AUDITLOG',
            'measure': 'MEASURE'
        };

        const results = [];
        for (const service of activeServices) {
            const upperServiceCode = serviceMap[service];
            if (upperServiceCode) {
                const result = await this.updateServiceStatus(tradeItemId, upperServiceCode, 'received');
                results.push({ service: upperServiceCode, result });
            }
        }
        return results;
    }

    async addMeasureService(tradeItemId) {
        try {
            console.log(`Attempting to add new MEASURE service for tradeItemId: ${tradeItemId}`);
            const url = new URL('/tradeitemservice', this.API_BASE_URL);
            console.log(`MEASURE service endpoint URL: ${url}`);
            console.log(`Full MEASURE service endpoint URL: ${url.href}`);
            const body = JSON.stringify({
                tradeItemId,
                serviceCode: 'MEASURE'
            });
            console.log(`Request body for adding MEASURE service: ${body}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: body
            });

            console.log(`Response status for adding MEASURE service: ${response.status}`);

            if (response.status === 409) {
                console.log('MEASURE service already exists, proceeding with update');
                return await this.updateMeasureStatus(tradeItemId, 'received');
            }

            if (response.status === 404) {
                console.error('MEASURE service endpoint not found. Please check the API configuration.');
                return null;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            console.log('Successfully added new MEASURE service:', result);
            return await this.updateMeasureStatus(tradeItemId, 'received');
        } catch (error) {
            console.error('Error adding MEASURE service:', error);
            console.error('Er is een fout opgetreden bij het toevoegen van de MEASURE service.');
            return null;
        }
    }

    async handleAllServices(product, serviceChecker, hierarchyId) {
        if (!product.tradeItemId) {
            console.log(`Skipping service handling for product without tradeItemId: ${JSON.stringify(product)}`);
            return; // Skip if no tradeItemId
        }

        try {
            console.log(`Handling services for product:`, product);

            // Get active services from ServiceChecker
            const servicesMap = await serviceChecker.checkServices([product.globalTradeItemNumber], product.informationProvider, hierarchyId);
            const activeServices = servicesMap[product.globalTradeItemNumber] || [];
            console.log(`Active services found:`, activeServices);

            // Update status for all active services
            const serviceResults = await this.updateAllActiveServices(product.tradeItemId, activeServices);
            console.log(`Service update results:`, serviceResults);

            // Handle MEASURE service separately if it's not already active
            let measureServiceResult = null;
            if (!activeServices.includes('measure') && product.serviceMeasure) {
                console.log(`Adding new MEASURE service for tradeItemId: ${product.tradeItemId}`);
                measureServiceResult = await this.addMeasureService(product.tradeItemId);
                console.log(`Result of adding new MEASURE service:`, measureServiceResult);
            }

            // Check and add audit measurement
            console.log(`Checking and adding audit measurement for product:`, product);
            const auditResult = await this.checkAndAddAuditMeasurement(product);
            console.log(`Result of checking and adding audit measurement:`, auditResult);

            return {
                serviceResults,
                measureServiceResult,
                auditResult
            };
        } catch (error) {
            console.error('Error handling services:', error);
            console.error('Er is een fout opgetreden bij het verwerken van de services.');
            return null;
        }
    }
}

// For CommonJS environments (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MeasureService };
}
