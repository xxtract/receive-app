const { MeasureService } = require('../public/js/services/measure-service');

// Mock fetch globally
global.fetch = jest.fn();

// Mock showAlert
jest.mock('../public/js/utils.js', () => ({
    showAlert: jest.fn()
}));

// Mock database pool
jest.mock('../database', () => ({
    pool: {
        query: jest.fn()
    }
}));

describe('MeasureService', () => {
    let measureService;
    let mockServiceChecker;
    let mockPool;

    beforeEach(() => {
        // Reset fetch mock
        fetch.mockReset();

        // Reset pool mock
        mockPool = require('../database').pool;
        mockPool.query.mockReset();

        // Initialize measure service
        measureService = new MeasureService({
            apiBaseUrl: 'http://catalog.xxtract.test/api'
        });

        // Mock service checker
        mockServiceChecker = {
            checkServices: jest.fn()
        };
    });

    describe('updateMeasureStatus', () => {
        it('should successfully update MEASURE service status', async () => {
            const mockResponse = { status: 'success' };
            fetch.mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            }));

            const result = await measureService.updateMeasureStatus(124261, 'received');

            expect(fetch).toHaveBeenCalledWith(
                'http://catalog.xxtract.test/api/tradeitemservice',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tradeItemId: 124261,
                        serviceCode: 'MEASURE',
                        serviceStatus: 'received'
                    })
                }
            );
            expect(result).toEqual(mockResponse);
        });

        it('should handle API errors with Dutch message', async () => {
            fetch.mockImplementationOnce(() => Promise.reject(new Error('API error')));

            await expect(measureService.updateMeasureStatus(124261, 'received'))
                .rejects.toThrow();
            
            const { showAlert } = require('../public/js/utils.js');
            expect(showAlert).toHaveBeenCalledWith(
                'Er is een fout opgetreden bij het bijwerken van de MEASURE service status.'
            );
        });
    });

    describe('addMeasureService', () => {
        it('should successfully add MEASURE service', async () => {
            const mockResponse = { status: 'success' };
            fetch.mockImplementation(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            }));

            const result = await measureService.addMeasureService(124261);

            expect(fetch).toHaveBeenCalledWith(
                'http://catalog.xxtract.test/api/tradeitemservice',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tradeItemId: 124261,
                        serviceCode: 'MEASURE'
                    })
                }
            );
            expect(result).toEqual(mockResponse);
        });

        it('should handle API errors with Dutch message', async () => {
            fetch.mockImplementationOnce(() => Promise.reject(new Error('API error')));

            await expect(measureService.addMeasureService(124261))
                .rejects.toThrow();
            
            const { showAlert } = require('../public/js/utils.js');
            expect(showAlert).toHaveBeenCalledWith(
                'Er is een fout opgetreden bij het toevoegen van de MEASURE service.'
            );
        });
    });

    describe('checkAndAddAuditMeasurement', () => {
        const mockProduct = {
            globalTradeItemNumber: '08718989018290',
            informationProvider: '8710624010003',
            orderNumber: 'ORDER123',
            productDescription: 'Test Product'
        };

        it('should not add a new measurement if one already exists', async () => {
            mockPool.query.mockResolvedValueOnce([[{ measurementID: 1 }]]);

            await measureService.checkAndAddAuditMeasurement(mockProduct);

            expect(mockPool.query).toHaveBeenCalledTimes(1);
            expect(mockPool.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO'));
        });

        it('should add a new measurement if one does not exist', async () => {
            mockPool.query.mockResolvedValueOnce([[]]);
            mockPool.query.mockResolvedValueOnce([{ insertId: 1 }]);

            await measureService.checkAndAddAuditMeasurement(mockProduct);

            expect(mockPool.query).toHaveBeenCalledTimes(2);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO tblauditmeasurements'),
                expect.arrayContaining([mockProduct.orderNumber, mockProduct.globalTradeItemNumber, mockProduct.informationProvider, mockProduct.productDescription])
            );
        });

        it('should handle database errors with Dutch message', async () => {
            mockPool.query.mockRejectedValue(new Error('Database error'));

            await expect(measureService.checkAndAddAuditMeasurement(mockProduct))
                .rejects.toThrow();
            
            const { showAlert } = require('../public/js/utils.js');
            expect(showAlert).toHaveBeenCalledWith(
                'Er is een fout opgetreden bij het controleren en toevoegen van de auditmetingen.'
            );
        });
    });

    describe('handleMeasureService', () => {
        const mockProduct = {
            tradeItemId: 124261,
            globalTradeItemNumber: '08718989018290',
            informationProvider: '8710624010003',
            hierarchyId: '123',
            orderNumber: 'ORDER123',
            productDescription: 'Test Product'
        };

        beforeEach(() => {
            fetch.mockReset();
            mockPool.query.mockReset();
        });

        it('should handle Scenario 1: existing MEASURE service', async () => {
            mockServiceChecker.checkServices.mockResolvedValue({
                [mockProduct.globalTradeItemNumber]: ['measure']
            });

            fetch.mockImplementation(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: 'success' })
            }));

            await measureService.handleMeasureService(mockProduct, mockServiceChecker);

            expect(fetch).toHaveBeenCalledTimes(2); // One for updateMeasureStatus, one for checkAndAddAuditMeasurement
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/tradeitemservice'),
                expect.objectContaining({
                    method: 'PUT'
                })
            );
            expect(fetch).toHaveBeenCalledWith(
                '/api/checkAndAddAuditMeasurement',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(mockProduct)
                })
            );
        });

        it('should handle Scenario 2: no existing MEASURE service', async () => {
            mockServiceChecker.checkServices.mockResolvedValue({
                [mockProduct.globalTradeItemNumber]: []
            });

            fetch.mockImplementation(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: 'success' })
            }));

            await measureService.handleMeasureService(mockProduct, mockServiceChecker);

            expect(fetch).toHaveBeenCalledTimes(3); // One for addMeasureService, one for updateMeasureStatus, one for checkAndAddAuditMeasurement
            const calls = fetch.mock.calls.map(call => call[1].method);
            expect(calls).toEqual(['POST', 'PUT', 'POST']);
        });

        it('should handle Scenario 4: no tradeItemId', async () => {
            const productWithoutId = { ...mockProduct, tradeItemId: null };
            
            await measureService.handleMeasureService(productWithoutId, mockServiceChecker);

            expect(mockServiceChecker.checkServices).not.toHaveBeenCalled();
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should handle API errors with Dutch message', async () => {
            mockServiceChecker.checkServices.mockRejectedValue(new Error('API error'));

            await expect(measureService.handleMeasureService(mockProduct, mockServiceChecker))
                .rejects.toThrow();
            
            const { showAlert } = require('../public/js/utils.js');
            expect(showAlert).toHaveBeenCalledWith(
                'Er is een fout opgetreden bij het verwerken van de MEASURE service en auditmetingen.'
            );
        });
    });

    describe('checkAndAddAuditMeasurement', () => {
        const mockProduct = {
            globalTradeItemNumber: '08718989018290',
            informationProvider: '8710624010003',
            orderNumber: 'ORDER123',
            productDescription: 'Test Product'
        };

        let measureService;
        let mockFetch;

        beforeEach(() => {
            jest.clearAllMocks();
            mockFetch = jest.fn();
            measureService = new MeasureService({ apiBaseUrl: 'http://test.api' });
            measureService.fetch = mockFetch;
        });

        it('should call the API to check and add audit measurement when no measurement exists', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ message: 'New audit measurement added' })
            });

            const result = await measureService.checkAndAddAuditMeasurement(mockProduct);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith('/api/checkAndAddAuditMeasurement', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mockProduct),
            });
            expect(result).toEqual({ message: 'New audit measurement added' });
        });

        it('should not add a new measurement if one already exists', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ message: 'Existing open measurement found' })
            });

            const result = await measureService.checkAndAddAuditMeasurement(mockProduct);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith('/api/checkAndAddAuditMeasurement', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mockProduct),
            });
            expect(result).toEqual({ message: 'Existing open measurement found' });
        });

        it('should handle API errors with Dutch message', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ message: 'Server error' })
            });

            await expect(measureService.checkAndAddAuditMeasurement(mockProduct))
                .rejects.toThrow('HTTP error! status: 500');
            
            const { showAlert } = require('../public/js/utils.js');
            expect(showAlert).toHaveBeenCalledWith(
                'Er is een fout opgetreden bij het controleren en toevoegen van de auditmetingen.'
            );
        });
    });
});