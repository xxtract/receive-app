import { showAlert } from './utils.js';

export class CompanySearch {
    constructor(config) {
        this.API_BASE_URL = config.apiBaseUrl;
        this.searchInput = config.searchInput;
        this.searchSpinner = config.searchSpinner;
        this.dropdown = config.dropdown;
        this.keyboardNavigation = config.keyboardNavigation;
        this.onCompanySelect = (companyName, informationProvider) => {
            config.onCompanySelect(companyName, informationProvider);
            this.resetBackgroundColor();
        };

        this.searchTimeout = null;
        this.lastSearchTerm = '';

        this.initializeEventListeners();
        this.resetBackgroundColor(); // Set initial background color
    }

    initializeEventListeners() {
        // Handle input changes
        this.searchInput.addEventListener('input', () => {
            this.handleInput();
        });

        // Handle Enter key
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchCompany();
            }
        });

        // Handle focus event
        this.searchInput.addEventListener('focus', () => {
            this.changeBackgroundColor();
        });

        // Handle blur event
        this.searchInput.addEventListener('blur', () => {
            this.resetBackgroundColor();
        });
    }

    changeBackgroundColor() {
        // Change the background color to white when focused
        this.searchInput.style.backgroundColor = 'white';
    }

    handleInput() {
        console.log('handleInput called in CompanySearch');
        const searchTerm = this.searchInput.value.trim();
        
        console.log('Search term:', searchTerm);
        
        // Don't search if term hasn't changed
        if (searchTerm === this.lastSearchTerm) {
            console.log('Search term unchanged, returning');
            return;
        }
        this.lastSearchTerm = searchTerm;

        // Reset keyboard navigation
        this.keyboardNavigation.reset();
        this.searchInput.setAttribute('aria-expanded', 'false');

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (searchTerm.length >= 3) {
            console.log('Setting timeout for searchCompany');
            this.searchTimeout = setTimeout(() => {
                this.searchCompany();
            }, 300);
        } else {
            console.log('Hiding dropdown');
            this.hideDropdown();
        }
    }

    resetBackgroundColor() {
        this.searchInput.style.backgroundColor = '#f8f9fa';
    }

    async searchCompany() {
        console.log('searchCompany called');
        const searchTerm = this.searchInput.value.trim();
        
        if (!searchTerm) {
            this.showErrorMessage('Voer een GLN nummer of bedrijfsnaam in');
            return;
        }

        // Check if input is a GLN number (only digits)
        const isGLN = /^\d+$/.test(searchTerm);
        
        if (isGLN) {
            // Validate GLN number length
            if (searchTerm.length !== 13) {
                this.showErrorMessage('GLN nummer moet exact 13 cijfers bevatten');
                return;
            }
        } else {
            // Validate company name length
            if (searchTerm.length < 3) {
                this.showErrorMessage('Bedrijfsnaam moet minimaal 3 karakters bevatten');
                return;
            }
        }

        console.log('Showing spinner');
        // Show spinner
        this.searchSpinner.style.display = 'inline-block';

        try {
            console.log('Sending API request');
            const response = await fetch(`${this.API_BASE_URL}/api/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ searchTerm })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API response:', data);

            if (data.error) {
                this.showErrorMessage(data.error);
                this.hideDropdown();
            } else if (data.found) {
                if (data.type === 'gln' || data.companies.length === 1) {
                    // Single result - select directly
                    const company = data.companies[0];
                    this.onCompanySelect(company.companyName, company.informationProvider, company.finishCode);
                    this.hideDropdown();
                } else {
                    // Multiple results - show dropdown
                    this.showCompanyDropdown(data.companies);
                }
            } else {
                this.showErrorMessage('Geen bedrijven gevonden');
                this.hideDropdown();
            }
        } catch (error) {
            console.error('API error:', error);
            this.handleApiError(error);
        } finally {
            console.log('Hiding spinner');
            // Hide spinner
            this.searchSpinner.style.display = 'none';
        }
    }

    showCompanyDropdown(companies) {
        console.log('showCompanyDropdown called with', companies.length, 'companies');
        console.log('Companies:', JSON.stringify(companies));
        console.log('Dropdown children before clearing:', this.dropdown.children.length);
        this.dropdown.innerHTML = '';
        console.log('Dropdown children after clearing:', this.dropdown.children.length);
        
        // Filter out duplicate companies based on GLN
        const uniqueCompanies = Array.from(new Map(companies.map(company => [company.informationProvider, company])).values());
        console.log('Unique companies:', uniqueCompanies.length);
        console.log('Unique companies:', JSON.stringify(uniqueCompanies));
        
        this.keyboardNavigation.setDropdownOptions(uniqueCompanies);
        
        const fragment = document.createDocumentFragment();
        uniqueCompanies.forEach((company, index) => {
            console.log(`Creating option for company ${index + 1}:`, JSON.stringify(company));
            const option = document.createElement('div');
            option.className = 'company-option';
            option.setAttribute('role', 'option');
            option.setAttribute('tabindex', '0');
            option.setAttribute('aria-selected', 'false');
            option.textContent = `${company.companyName} (GLN: ${company.informationProvider})`;
            console.log('Creating company option with data:', company);
            option.onclick = () => {
                console.log('Selected company data:', {
                    companyName: company.companyName,
                    informationProvider: company.informationProvider,
                    finishCode: company.finishCode
                });
                this.onCompanySelect(company.companyName, company.informationProvider, company.finishCode);
            };
            option.onmouseenter = () => {
                this.keyboardNavigation.selectedCompanyIndex = index;
                this.keyboardNavigation.updateDropdownSelection();
            };
            fragment.appendChild(option);
        });

        console.log('Fragment children:', fragment.children.length);
        this.dropdown.appendChild(fragment);
        console.log('Dropdown children after appending fragment:', this.dropdown.children.length);

        console.log('Dropdown populated with', this.dropdown.children.length, 'options');
        this.dropdown.style.display = 'block';
        this.searchInput.setAttribute('aria-expanded', 'true');
    }

    hideDropdown() {
        this.dropdown.style.display = 'none';
        this.searchInput.setAttribute('aria-expanded', 'false');
        this.keyboardNavigation.reset();
    }

    showErrorMessage(message) {
        showAlert(message, false);
    }

    handleApiError(error) {
        console.error('API error:', error);
        if (error.name === 'AbortError') {
            this.showErrorMessage('De zoekopdracht is geannuleerd. Probeer het opnieuw.');
        } else if (error.message.includes('NetworkError')) {
            this.showErrorMessage('Er is een netwerkfout opgetreden. Controleer uw internetverbinding en probeer het opnieuw.');
        } else if (error.message.includes('status: 404')) {
            this.showErrorMessage('De gevraagde informatie kon niet worden gevonden. Probeer een andere zoekopdracht.');
        } else if (error.message.includes('status: 500')) {
            this.showErrorMessage('Er is een serverfout opgetreden. Probeer het later opnieuw.');
        } else {
            this.showErrorMessage('Er is een onverwachte fout opgetreden bij het zoeken. Probeer het opnieuw.');
        }
        this.hideDropdown();
    }
}
