import { showAlert } from '../utils.js';

export class ServiceChecker {
    constructor(config) {
        this.API_BASE_URL = config.apiBaseUrl;
        this.servicesApiUrl = config.servicesApiUrl;
        this.modalManager = config.modalManager;
        
        if (!this.servicesApiUrl) {
            console.error('Services API URL not provided in config');
            showAlert('Services API configuratie ontbreekt');
        }
    }

    async checkServices(gtins, gln, hierarchyId) {
        if (!this.servicesApiUrl) {
            console.error('Services API URL not configured');
            showAlert('Services API configuratie ontbreekt');
            return {};
        }

        console.log('Services API URL:', this.servicesApiUrl);
        console.log('GLN:', gln);
        console.log('GTINs:', gtins);
        console.log('HierarchyId:', hierarchyId);

        const servicesMap = {};

        for (const gtin of gtins) {
            try {
                const url = `${this.servicesApiUrl}/${hierarchyId}/${gln}-${gtin}-528`;
                console.log('Checking services URL:', url);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                });
                console.log('Response status:', response.status);
                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn(`No services found for GTIN: ${gtin}. This is normal for new products.`);
                        servicesMap[gtin] = [];
                        continue;
                    } else {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                }
                const data = await response.json();
                console.log(`Services API response for ${gtin}:`, JSON.stringify(data, null, 2));

                const activeServices = [];
                const servicesToCheck = ['measure', 'packshot', 'packinfo', 'labelimage', 'auditlog'];

                for (const [serviceCode, serviceData] of Object.entries(data)) {
                    const lowerServiceCode = serviceCode.toLowerCase();
                    if (servicesToCheck.includes(lowerServiceCode)) {
                        const status = serviceData.restApi?.message?.currentStatus;
                        if (status && ['open', 'requested', 'expected'].includes(status.toLowerCase())) {
                            activeServices.push(lowerServiceCode);
                        }
                    }
                }

                console.log(`Active services for ${gtin}:`, activeServices);
                servicesMap[gtin] = activeServices;

                // Show modal if services are found
                if (activeServices.length > 0 && this.modalManager) {
                    this.modalManager.showServicesModal(activeServices.join(', '));
                }
            } catch (error) {
                console.error(`Error checking services for GTIN ${gtin}:`, error);
                servicesMap[gtin] = [];
            }
        }

        return servicesMap;
    }

    updateServiceIcons(activeServices, gtin) {
        console.log('Updating service icons with active services:', activeServices);

        // Find the row with the matching GTIN
        const row = document.querySelector(`tr[data-gtin="${gtin}"]`);
        if (!row) {
            console.warn(`Row for GTIN ${gtin} not found in the DOM.`);
            return;
        }

        // Find the services cell in the row
        const servicesCell = row.querySelector('.services-cell');
        if (!servicesCell) {
            console.warn(`Services cell for GTIN ${gtin} not found in the DOM.`);
            return;
        }

        // Convert activeServices to lowercase for case-insensitive comparison
        const lowerActiveServices = activeServices.map(service => service.toLowerCase());

        // Update service icons
        const serviceIconsMap = {
            'measure': 'mdi-ruler-square',
            'packshot': 'mdi-camera',
            'packinfo': 'mdi-package-variant-closed',
            'labelimage': 'mdi-image',
            'auditlog': 'mdi-file-document-edit'
        };

        let iconsHTML = '';
        Object.entries(serviceIconsMap).forEach(([service, icon]) => {
            const isActive = lowerActiveServices.includes(service) ||
                (service === 'measure' && lowerActiveServices.includes('auditlog')) ||
                (service === 'packshot' && lowerActiveServices.includes('labelimage'));
            
            if (isActive) {
                iconsHTML += `<i class="mdi ${icon} service-icon active" data-service="${service}"></i>`;
            }
        });

        servicesCell.innerHTML = iconsHTML;

        console.log('Service icons update completed for GTIN:', gtin);
    }
}

// For CommonJS environments (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ServiceChecker };
}
