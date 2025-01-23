export class ModalManager {
    constructor(config) {
        this.deleteModal = config.deleteModal;
        this.deleteModalBody = config.deleteModalBody;
        this.deleteCancelButton = config.deleteCancelButton;
        this.deleteConfirmButton = config.deleteConfirmButton;
        this.confirmModal = config.confirmModal;
        this.cancelButton = config.cancelButton;
        this.confirmButton = config.confirmButton;
        this.servicesModal = config.servicesModal;
        this.servicesModalBody = config.servicesModalBody;
        this.servicesCloseButton = config.servicesCloseButton;
        this.onDeleteConfirm = config.onDeleteConfirm;
        this.onCompanyChangeConfirm = config.onCompanyChangeConfirm;
        this.onCompanyChangeCancel = config.onCompanyChangeCancel;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Delete modal
        if (this.deleteCancelButton) {
            this.deleteCancelButton.addEventListener('click', () => {
                this.hideDeleteModal();
            });
        }

        // Company change modal
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => {
                this.hideConfirmModal();
                if (this.onCompanyChangeCancel) {
                    this.onCompanyChangeCancel();
                }
            });
        }

        if (this.confirmButton) {
            this.confirmButton.addEventListener('click', () => {
                this.hideConfirmModal();
                if (this.onCompanyChangeConfirm) {
                    this.onCompanyChangeConfirm();
                }
            });
        }

        // Services modal
        if (this.servicesCloseButton) {
            console.log('Adding event listener to services close button');
            this.servicesCloseButton.addEventListener('click', () => {
                this.hideServicesModal();
            });
        }
    }

    showDeleteConfirmation(gtin, productName) {
        if (this.deleteModalBody) {
            this.deleteModalBody.textContent = `Weet je zeker dat je ${productName} (${gtin}) wilt verwijderen?`;
        }
        if (this.deleteModal) {
            this.deleteModal.style.display = 'flex';
            this.deleteCancelButton?.focus();
        }

        // Set up one-time click handler for confirm button
        const handleConfirm = () => {
            this.hideDeleteModal();
            if (this.onDeleteConfirm) {
                this.onDeleteConfirm(gtin);
            }
            this.deleteConfirmButton?.removeEventListener('click', handleConfirm);
        };

        this.deleteConfirmButton?.addEventListener('click', handleConfirm);
    }

    hideDeleteModal() {
        if (this.deleteModal) {
            this.deleteModal.style.display = 'none';
        }
    }

    showConfirmModal() {
        if (this.confirmModal) {
            this.confirmModal.style.display = 'flex';
            this.cancelButton?.focus();
        }
    }

    hideConfirmModal() {
        if (this.confirmModal) {
            this.confirmModal.style.display = 'none';
        }
    }

    showServicesModal(services) {
        if (this.servicesModalBody && this.servicesModal) {
            this.servicesModalBody.innerHTML = `
                <p>Voor deze GTIN zijn de volgende diensten besteld:</p>
                <ul>
                    ${services.map(service => `<li>${service}</li>`).join('')}
                </ul>
            `;
            this.servicesModal.style.display = 'flex';
            this.servicesCloseButton?.focus();
        }
    }

    hideServicesModal() {
        if (this.servicesModal) {
            this.servicesModal.style.display = 'none';
        }
    }
}

// For CommonJS environments (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModalManager };
}
