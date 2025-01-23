import { showAlert } from './utils.js';

export class KeyboardNavigation {
    constructor(searchInput, dropdown, onCompanySelect, onSearch) {
        this.searchInput = searchInput;
        this.dropdown = dropdown;
        this.onCompanySelect = onCompanySelect;
        this.onSearch = onSearch;
        this.selectedCompanyIndex = -1;
        this.dropdownOptions = [];
        this.isDropdownVisible = false;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Handle keyboard events directly on the search input
        this.searchInput.addEventListener('keydown', (e) => {
            console.log('Input keydown:', e.key, 'Dropdown visible:', this.isDropdownVisible);
            
            if (this.isDropdownVisible) {
                switch(e.key) {
                    case 'ArrowDown':
                    case 'ArrowUp':
                    case 'Tab':
                    case 'Enter':
                    case 'Escape':
                        e.preventDefault();
                        e.stopPropagation();
                        this.handleSpecialKey(e.key);
                        break;
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.onSearch();
            }
        });

        // Handle keyboard events on dropdown options
        this.dropdown.addEventListener('keydown', (e) => {
            const option = e.target.closest('.company-option');
            if (!option) return;

            switch(e.key) {
                case 'ArrowDown':
                case 'ArrowUp':
                    e.preventDefault();
                    this.handleSpecialKey(e.key);
                    break;
                case 'Tab':
                    e.preventDefault();
                    const index = Array.from(this.dropdown.children).indexOf(option);
                    if (index !== -1) {
                        const selectedOption = this.dropdownOptions[index];
                        this.onCompanySelect(selectedOption.companyName, selectedOption.informationProvider, selectedOption.finishCode);
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    const enterIndex = Array.from(this.dropdown.children).indexOf(option);
                    if (enterIndex !== -1) {
                        const selectedOption = this.dropdownOptions[enterIndex];
                        this.onCompanySelect(selectedOption.companyName, selectedOption.informationProvider, selectedOption.finishCode);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.hideDropdown();
                    this.searchInput.focus();
                    break;
            }
        });

        // Monitor dropdown visibility changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const wasVisible = this.isDropdownVisible;
                    this.isDropdownVisible = this.dropdown.style.display === 'block';
                    
                    if (!wasVisible && this.isDropdownVisible) {
                        this.selectedCompanyIndex = -1;
                        console.log('Dropdown became visible, reset selection');
                    }
                    
                    console.log('Dropdown visibility changed:', this.isDropdownVisible);
                }
            });
        });

        observer.observe(this.dropdown, {
            attributes: true,
            attributeFilter: ['style']
        });

        // Handle mouse interactions
        this.dropdown.addEventListener('mouseover', (e) => {
            const option = e.target.closest('.company-option');
            if (option) {
                const index = Array.from(this.dropdown.children).indexOf(option);
                if (index !== -1 && index !== this.selectedCompanyIndex) {
                    this.selectedCompanyIndex = index;
                    this.updateDropdownSelection();
                    console.log('Mouse hover, selected index:', index);
                }
            }
        });

        this.dropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.company-option');
            if (option) {
                const index = Array.from(this.dropdown.children).indexOf(option);
                if (index !== -1) {
                    this.selectedCompanyIndex = index;
                    const selectedOption = this.dropdownOptions[index];
                    this.onCompanySelect(selectedOption.companyName, selectedOption.informationProvider, selectedOption.finishCode);
                    console.log('Option clicked, index:', index);
                }
            }
        });
    }

    handleSpecialKey(key) {
        console.log('Handling special key:', key);
        
        switch(key) {
            case 'ArrowDown':
                this.handleArrowDown();
                break;
            
            case 'ArrowUp':
                this.handleArrowUp();
                break;
            
            case 'Tab':
                this.handleTab();
                break;
            
            case 'Enter':
                this.handleEnter();
                break;

            case 'Escape':
                this.hideDropdown();
                break;
        }
    }

    handleArrowDown() {
        if (this.dropdownOptions.length === 0) return;

        if (this.selectedCompanyIndex === -1) {
            this.selectedCompanyIndex = 0;
        } else {
            this.selectedCompanyIndex = (this.selectedCompanyIndex + 1) % this.dropdownOptions.length;
        }
        console.log('ArrowDown pressed, new index:', this.selectedCompanyIndex);
        this.updateDropdownSelection();
        this.focusOption(this.selectedCompanyIndex);
    }

    handleArrowUp() {
        if (this.dropdownOptions.length === 0) return;

        if (this.selectedCompanyIndex === -1) {
            this.selectedCompanyIndex = this.dropdownOptions.length - 1;
        } else {
            this.selectedCompanyIndex = (this.selectedCompanyIndex - 1 + this.dropdownOptions.length) % this.dropdownOptions.length;
        }
        console.log('ArrowUp pressed, new index:', this.selectedCompanyIndex);
        this.updateDropdownSelection();
        this.focusOption(this.selectedCompanyIndex);
    }

    handleTab() {
        if (this.dropdownOptions.length > 0) {
            console.log('Tab pressed, focusing first company');
            this.selectedCompanyIndex = 0;
            this.updateDropdownSelection();
            this.focusOption(0);
        }
    }

    handleEnter() {
        if (this.selectedCompanyIndex !== -1 && this.dropdownOptions.length > 0) {
            console.log('Enter pressed, selecting company at index:', this.selectedCompanyIndex);
            const selectedOption = this.dropdownOptions[this.selectedCompanyIndex];
            this.onCompanySelect(selectedOption.companyName, selectedOption.informationProvider, selectedOption.finishCode);
            this.hideDropdown();
        } else {
            this.onSearch();
        }
    }

    focusOption(index) {
        const options = this.dropdown.getElementsByClassName('company-option');
        if (options[index]) {
            options[index].focus();
        }
    }

    updateDropdownSelection() {
        if (!this.isDropdownVisible) return;

        const options = this.dropdown.getElementsByClassName('company-option');
        Array.from(options).forEach((option, index) => {
            if (index === this.selectedCompanyIndex) {
                option.classList.add('selected');
                option.setAttribute('aria-selected', 'true');
                this.ensureOptionVisible(option);
            } else {
                option.classList.remove('selected');
                option.setAttribute('aria-selected', 'false');
            }
        });
        console.log('Updated dropdown selection, current index:', this.selectedCompanyIndex);
    }

    ensureOptionVisible(option) {
        const dropdownRect = this.dropdown.getBoundingClientRect();
        const optionRect = option.getBoundingClientRect();

        if (optionRect.top < dropdownRect.top) {
            option.scrollIntoView(true);
        } else if (optionRect.bottom > dropdownRect.bottom) {
            option.scrollIntoView(false);
        }
    }

    setDropdownOptions(options) {
        this.dropdownOptions = options;
        this.selectedCompanyIndex = -1;
        this.isDropdownVisible = true;
        console.log('Set dropdown options:', options.length, 'items');
    }

    hideDropdown() {
        this.dropdown.style.display = 'none';
        this.searchInput.setAttribute('aria-expanded', 'false');
        this.isDropdownVisible = false;
        console.log('Dropdown hidden');
    }

    reset() {
        this.selectedCompanyIndex = -1;
        this.dropdownOptions = [];
        this.isDropdownVisible = false;
        console.log('Navigation reset');
    }
}
