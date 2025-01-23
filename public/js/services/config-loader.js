import { showAlert } from '../utils.js';

export class ConfigLoader {
    constructor(apiBaseUrl) {
        this.API_BASE_URL = apiBaseUrl;
    }

    async loadConfig() {
        try {
            console.log('Loading config from:', `${this.API_BASE_URL}/api/config`);
            const response = await fetch(`${this.API_BASE_URL}/api/config`);
            const config = await response.json();
            console.log('Loaded config:', config);

            if (!config.servicesApiUrl) {
                console.error('Services API URL not found in config');
                showAlert('Services API configuratie ontbreekt');
                return null;
            }

            return config;
        } catch (error) {
            console.error('Error loading config:', error);
            showAlert('Er is een fout opgetreden bij het laden van de configuratie');
            return null;
        }
    }
}
