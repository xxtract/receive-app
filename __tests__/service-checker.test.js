const { ServiceChecker } = require('../public/js/services/service-checker');

// Mock fetch globally
global.fetch = jest.fn();

describe('Service Checker', () => {
    let serviceChecker;
    let modalManager;

    beforeEach(() => {
        // Reset fetch mock
        fetch.mockReset();

        // Mock modal manager
        modalManager = {
            showServicesModal: jest.fn()
        };

        // Initialize service checker
        serviceChecker = new ServiceChecker({
            apiBaseUrl: 'http://localhost:3000',
            modalManager: modalManager
        });

        // Set services API URL
        serviceChecker.setApiUrl('http://catalog.xxtract.test/api/tradeitemservice/metadata');
    });

    it('should find PackInfo service for example GTIN', async () => {
        // Test data
        const gln = '8710624010003';
        const gtin = '08718989018290';

        // Mock services API response
        fetch.mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                PackInfo: {
                    restApi: {
                        message: {
                            currentStatus: 'requested'
                        }
                    }
                }
            })
        }));

        // Call service checker
        await serviceChecker.checkServices([gtin], gln);

        // Verify API call
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0][0]).toContain(`/${gln}-${gtin}-528`);

        // Verify modal was shown with PackInfo service
        expect(modalManager.showServicesModal).toHaveBeenCalled();
        const modalCall = modalManager.showServicesModal.mock.calls[0][0];
        expect(modalCall).toContain('packinfo');
    });

    it('should handle missing product', async () => {
        const gln = '8710624010003';
        const gtin = '08718989018290';

        // Mock services API to return no services
        fetch.mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({})
        }));

        // Call service checker
        await serviceChecker.checkServices([gtin], gln);

        // Verify API call
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0][0]).toContain(`/${gln}-${gtin}-528`);

        // Verify modal was not shown
        expect(modalManager.showServicesModal).not.toHaveBeenCalled();
    });

    it('should handle API error', async () => {
        const gln = '8710624010003';
        const gtin = '08718989018290';

        // Mock API error
        fetch.mockImplementationOnce(() => Promise.reject(new Error('API error')));

        // Call service checker
        await serviceChecker.checkServices([gtin], gln);

        // Verify error handling
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(modalManager.showServicesModal).not.toHaveBeenCalled();
    });
    it('should update service icons correctly', () => {
        // Mock document.querySelector
        document.querySelector = jest.fn();

        // Mock row and services cell
        const mockRow = {
            querySelector: jest.fn().mockReturnValue({
                innerHTML: ''
            })
        };

        // Set up mock return for document.querySelector
        document.querySelector.mockReturnValue(mockRow);

        // Call updateServiceIcons with mock active services and GTIN
        serviceChecker.updateServiceIcons(['measure', 'labelimage'], '12345678901234');

        // Verify document.querySelector was called with the correct selector
        expect(document.querySelector).toHaveBeenCalledWith('tr[data-gtin="12345678901234"]');

        // Verify row.querySelector was called to find the services cell
        expect(mockRow.querySelector).toHaveBeenCalledWith('.services-cell');

        // Verify the innerHTML of the services cell was updated
        const servicesCell = mockRow.querySelector('.services-cell');
        expect(servicesCell.innerHTML).toContain('active');
        expect(servicesCell.innerHTML).toContain('mdi-ruler-square');
        expect(servicesCell.innerHTML).toContain('mdi-camera');
        expect(servicesCell.innerHTML).not.toContain('mdi-package-variant-closed');
    });

    it('should handle missing row when updating service icons', () => {
        // Mock console.warn
        console.warn = jest.fn();

        // Mock document.querySelector to return null (row not found)
        document.querySelector = jest.fn().mockReturnValue(null);

        // Call updateServiceIcons with a non-existent GTIN
        serviceChecker.updateServiceIcons(['measure'], '99999999999999');

        // Verify console.warn was called
        expect(console.warn).toHaveBeenCalledWith('Row for GTIN 99999999999999 not found in the DOM.');
    });
});
