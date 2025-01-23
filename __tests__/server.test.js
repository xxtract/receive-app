const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Mock the database module
jest.mock('../database', () => ({
    queryCompanyByGLN: jest.fn(),
    queryCompanyByName: jest.fn(),
    searchProduct: jest.fn(),
    padGTIN: (gtin) => {
        // Remove any non-digit characters (like GTIN-128 format "(01)")
        gtin = gtin.replace(/\D/g, '');
        // Pad with leading zeros to make it 14 digits
        return gtin.padStart(14, '0');
    }
}));

const { queryCompanyByGLN, queryCompanyByName, searchProduct, padGTIN } = require('../database');

describe('Server API Tests', () => {
    let app;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Create a fresh app instance for each test
        app = express();
        app.use(cors());
        app.use(express.json());

        // Add test routes
        app.post('/api/search', async (req, res) => {
            const { searchTerm } = req.body;
            
            if (!searchTerm) {
                return res.status(400).json({ error: 'Voer een GLN nummer of bedrijfsnaam in' });
            }

            try {
                const isGLN = /^\d+$/.test(searchTerm);
                let results;

                if (isGLN) {
                    results = await queryCompanyByGLN(searchTerm);
                } else {
                    results = await queryCompanyByName(searchTerm);
                }

                if (results && results.length > 0) {
                    const companies = results.map(row => ({
                        companyName: row.companyName,
                        informationProvider: row.informationProvider
                    }));

                    res.json({ 
                        found: true, 
                        type: isGLN ? 'gln' : 'name',
                        companies: companies 
                    });
                } else {
                    res.json({ found: false });
                }
            } catch (error) {
                res.status(500).json({ error: 'Database query failed' });
            }
        });

        app.post('/api/search-product', async (req, res) => {
            const { gln, gtin } = req.body;
            
            if (!gln || !gtin) {
                return res.status(400).json({ error: 'GLN en GTIN zijn verplicht' });
            }

            try {
                const paddedGtin = padGTIN(gtin);
                const { rows: results, source } = await searchProduct(gln, paddedGtin);
                if (results && results.length > 0) {
                    res.json({ found: true, products: results, source });
                } else {
                    res.json({ found: false, source: 'none' });
                }
            } catch (error) {
                res.status(500).json({ error: 'Database query failed' });
            }
        });
    });

    describe('GLN Search Endpoint Tests', () => {
        it('should return 400 if search term is missing', async () => {
            const response = await request(app)
                .post('/api/search')
                .send({});
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Voer een GLN nummer of bedrijfsnaam in');
            expect(queryCompanyByGLN).not.toHaveBeenCalled();
        });

        it('should return company data for valid GLN', async () => {
            const mockCompany = { companyName: 'Test Company', informationProvider: '8714529000008' };
            queryCompanyByGLN.mockResolvedValueOnce([mockCompany]);

            const response = await request(app)
                .post('/api/search')
                .send({ searchTerm: '8714529000008' });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('found', true);
            expect(response.body.companies[0]).toEqual(mockCompany);
            expect(queryCompanyByGLN).toHaveBeenCalledWith('8714529000008');
        });

        it('should return not found for unknown GLN', async () => {
            queryCompanyByGLN.mockResolvedValueOnce([]);

            const response = await request(app)
                .post('/api/search')
                .send({ searchTerm: '8714529000009' });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('found', false);
            expect(queryCompanyByGLN).toHaveBeenCalledWith('8714529000009');
        });

        it('should handle database errors', async () => {
            queryCompanyByGLN.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .post('/api/search')
                .send({ searchTerm: '8714529000008' });
            
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Database query failed');
            expect(queryCompanyByGLN).toHaveBeenCalledWith('8714529000008');
        });
    });

    describe('Product Search Endpoint Tests', () => {
        it('should return 400 if GLN or GTIN is missing', async () => {
            const response = await request(app)
                .post('/api/search-product')
                .send({});
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'GLN en GTIN zijn verplicht');
            expect(searchProduct).not.toHaveBeenCalled();
        });

        it('should return product data and source for valid GTIN found in tradeItem', async () => {
            const mockProduct = {
                globalTradeItemNumber: '00012345678905',
                productDescription: 'Test Product',
                tradeItemUnitDescriptor: 'BASE_UNIT_OR_EACH',
                quantityOfChildren: '10',
                productType: 'CE'
            };

            searchProduct.mockResolvedValueOnce({ rows: [mockProduct], source: 'tradeItem' });

            const response = await request(app)
                .post('/api/search-product')
                .send({
                    gln: '8714529000008',
                    gtin: '12345678905'
                });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('found', true);
            expect(response.body).toHaveProperty('source', 'tradeItem');
            expect(response.body.products[0]).toEqual(mockProduct);
            expect(searchProduct).toHaveBeenCalledWith('8714529000008', '00012345678905');
        });

        it('should return product data and source for valid GTIN found in tblproducts', async () => {
            const mockProduct = {
                globalTradeItemNumber: '00012345678905',
                productDescription: 'Test Product',
                tradeItemUnitDescriptor: 'BASE_UNIT_OR_EACH',
                productType: 'CE'
            };

            searchProduct.mockResolvedValueOnce({ rows: [mockProduct], source: 'tblproducts' });

            const response = await request(app)
                .post('/api/search-product')
                .send({
                    gln: '8714529000008',
                    gtin: '12345678905'
                });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('found', true);
            expect(response.body).toHaveProperty('source', 'tblproducts');
            expect(response.body.products[0]).toEqual(mockProduct);
            expect(searchProduct).toHaveBeenCalledWith('8714529000008', '00012345678905');
        });

        it('should return not found for unknown GTIN', async () => {
            searchProduct.mockResolvedValueOnce({ rows: [], source: 'none' });

            const response = await request(app)
                .post('/api/search-product')
                .send({
                    gln: '8714529000008',
                    gtin: '00012345678905'
                });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('found', false);
            expect(response.body).toHaveProperty('source', 'none');
            expect(searchProduct).toHaveBeenCalledWith('8714529000008', '00012345678905');
        });

        it('should handle database errors for product search', async () => {
            searchProduct.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .post('/api/search-product')
                .send({
                    gln: '8714529000008',
                    gtin: '00012345678905'
                });
            
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Database query failed');
            expect(searchProduct).toHaveBeenCalledWith('8714529000008', '00012345678905');
        });

        it('should return product data for the specific GLN and GTIN provided by the user', async () => {
            const mockProduct = {
                globalTradeItemNumber: '02137800003998',
                productDescription: 'Test Product',
                tradeItemUnitDescriptor: 'BASE_UNIT_OR_EACH',
                productType: 'CE'
            };

            searchProduct.mockResolvedValueOnce({ rows: [mockProduct], source: 'tblproducts' });

            const response = await request(app)
                .post('/api/search-product')
                .send({
                    gln: '8719328024019',
                    gtin: '02137800003998'
                });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('found', true);
            expect(response.body).toHaveProperty('source', 'tblproducts');
            expect(response.body.products[0]).toEqual(mockProduct);
            expect(searchProduct).toHaveBeenCalledWith('8719328024019', '02137800003998');
        });
    });
});
