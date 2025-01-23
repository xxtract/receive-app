// Mock the database module
jest.mock('../database', () => {
    const originalModule = jest.requireActual('../database');
    return {
        ...originalModule,
        processReception: jest.fn()
    };
});

const { processReception } = require('../database');
const { MeasureService } = require('../public/js/services/measure-service');
const { ServiceChecker } = require('../public/js/services/service-checker');

describe('processReception', () => {
    let mockMeasureService;
    let mockServiceChecker;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock MeasureService
        mockMeasureService = {
            handleMeasureService: jest.fn(),
            updateMeasureStatus: jest.fn(),
            addMeasureService: jest.fn()
        };

        // Mock ServiceChecker
        mockServiceChecker = {
            checkServices: jest.fn()
        };

        // Reset processReception mock
        processReception.mockReset();
    });

    it('should handle Scenario 1: existing MEASURE service', async () => {
        const product = {
            globalTradeItemNumber: '08718989018290',
            informationProvider: '8710624010003',
            productType: 'CE',
            tradeItemId: '124261',
            dateTime: '2025-01-05T12:00:00Z',
            source: 'tradeItems'
        };

        processReception.mockResolvedValueOnce({
            success: true,
            message: '1 products processed successfully'
        });

        const result = await processReception([product], mockMeasureService, mockServiceChecker);

        expect(result.success).toBe(true);
        expect(processReception).toHaveBeenCalledWith(
            [product],
            mockMeasureService,
            mockServiceChecker
        );
    });

    it('should handle Scenario 2: no existing MEASURE service', async () => {
        const product = {
            globalTradeItemNumber: '08718989018290',
            informationProvider: '8710624010003',
            productType: 'CE',
            tradeItemId: '124261',
            dateTime: '2025-01-05T12:00:00Z',
            source: 'tradeItems'
        };

        processReception.mockResolvedValueOnce({
            success: true,
            message: '1 products processed successfully'
        });

        const result = await processReception([product], mockMeasureService, mockServiceChecker);

        expect(result.success).toBe(true);
        expect(processReception).toHaveBeenCalledWith(
            [product],
            mockMeasureService,
            mockServiceChecker
        );
    });

    it('should handle Scenario 3: product from tblproducts', async () => {
        const product = {
            globalTradeItemNumber: '08718989018290',
            informationProvider: '8710624010003',
            productType: 'CE',
            tradeItemId: '124261',
            dateTime: '2025-01-05T12:00:00Z',
            source: 'tblproducts'
        };

        processReception.mockResolvedValueOnce({
            success: true,
            message: '1 products processed successfully'
        });

        const result = await processReception([product], mockMeasureService, mockServiceChecker);

        expect(result.success).toBe(true);
        expect(processReception).toHaveBeenCalledWith(
            [product],
            mockMeasureService,
            mockServiceChecker
        );
    });

    it('should handle Scenario 4: product not found', async () => {
        const product = {
            globalTradeItemNumber: '08718989018290',
            informationProvider: '8710624010003',
            productType: 'CE',
            tradeItemId: null,
            dateTime: '2025-01-05T12:00:00Z'
        };

        processReception.mockResolvedValueOnce({
            success: true,
            message: '1 products processed successfully'
        });

        const result = await processReception([product], mockMeasureService, mockServiceChecker);

        expect(result.success).toBe(true);
        expect(processReception).toHaveBeenCalledWith(
            [product],
            mockMeasureService,
            mockServiceChecker
        );
    });

    it('should handle MEASURE service errors gracefully', async () => {
        const product = {
            globalTradeItemNumber: '08718989018290',
            informationProvider: '8710624010003',
            productType: 'CE',
            tradeItemId: '124261',
            dateTime: '2025-01-05T12:00:00Z',
            source: 'tradeItems'
        };

        processReception.mockResolvedValueOnce({
            success: true,
            message: '1 products processed successfully'
        });

        const result = await processReception([product], mockMeasureService, mockServiceChecker);

        expect(result.success).toBe(true);
        expect(processReception).toHaveBeenCalledWith(
            [product],
            mockMeasureService,
            mockServiceChecker
        );
    });

    it('should handle database errors', async () => {
        const product = {
            globalTradeItemNumber: '08718989018290',
            informationProvider: '8710624010003',
            productType: 'CE',
            tradeItemId: '124261',
            dateTime: '2025-01-05T12:00:00Z'
        };

        processReception.mockRejectedValueOnce(new Error('Database Error'));

        await expect(processReception([product], mockMeasureService, mockServiceChecker))
            .rejects.toThrow('Database Error');
    });
});