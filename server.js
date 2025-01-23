import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import { queryCompanyByGLN, queryCompanyByName, searchProduct, getSampleProducts, processReception } from './database.js';
import apiRoutes from './server/api.js';
import { MeasureService } from './public/js/services/measure-service.js';
import { ServiceChecker } from './public/js/services/service-checker.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set the time zone to Amsterdam
process.env.TZ = 'Europe/Amsterdam';

const app = express();
const port = process.env.PORT || 3000;

// Initialize MeasureService and ServiceChecker
const measureService = new MeasureService({ apiBaseUrl: process.env.SERVICES_API_URL });
const serviceChecker = new ServiceChecker({
    apiBaseUrl: process.env.SERVICES_API_URL,
    servicesApiUrl: process.env.SERVICES_API_URL
});

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// API routes
app.use('/api', apiRoutes);

// Process reception endpoint
app.post('/api/process-reception', async (req, res) => {
    console.log('Received process reception request:', JSON.stringify(req.body, null, 2));
    try {
        // Log the raw service-related values
        req.body.forEach((product, index) => {
            console.log(`Raw product ${index} service values:`, {
                serviceLabelImage: product.serviceLabelImage,
                servicePackInfo: product.servicePackInfo,
                servicePackshot: product.servicePackshot
            });
        });

        // Clean up the received data and update timestamp
        const currentTime = new Date().toISOString();
        const cleanedProducts = req.body.map(product => ({
            ...product,
            globalTradeItemNumber: product.globalTradeItemNumber.trim(),
            informationProvider: product.informationProvider.trim(),
            productType: product.productType.includes('selecteer') ? '' : product.productType.trim(),
            tradeItemId: product.tradeItemId === "null" ? null : (product.tradeItemId || null),
            dateTime: currentTime,
            serviceLabelImage: Boolean(product.serviceLabelImage),
            servicePackInfo: Boolean(product.servicePackInfo),
            servicePackshot: Boolean(product.servicePackshot),
            finishCode: product.finishCode || null,
            orderNumber: product.orderNumber || '2562210'
        }));
        console.log('Cleaned products:', JSON.stringify(cleanedProducts, null, 2));
        const result = await processReception(cleanedProducts, measureService, serviceChecker);
        console.log('Process reception result:', JSON.stringify(result, null, 2));
        console.log('SQL Queries executed:', JSON.stringify(result.queries, null, 2));
        console.log('Audit measurement records created:', JSON.stringify(result.auditMeasurementRecords, null, 2));
        res.json({
            success: true,
            message: 'Reception processed successfully',
            result: {
                ...result,
                queries: result.queries.map(q => ({ ...q, values: JSON.stringify(q.values) })),
                auditMeasurementRecords: result.auditMeasurementRecords
            }
        });
    } catch (error) {
        console.error('Error processing reception:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ success: false, error: 'Failed to process reception', details: error.message });
    }
});

// Config endpoint
app.get('/api/config', (req, res) => {
    console.log('Config request received');
    console.log('SERVICES_API_URL:', process.env.SERVICES_API_URL);
    
    if (!process.env.SERVICES_API_URL) {
        console.error('SERVICES_API_URL not found in environment variables');
        return res.status(500).json({ error: 'Services API URL not configured' });
    }

    res.json({
        servicesApiUrl: process.env.SERVICES_API_URL,
        labelPrinterApiUrl: process.env.LABELPRINTER_API_URL
    });
});

// Sample products endpoint
app.get('/api/sample-products', async (req, res) => {
    console.log('Received request for sample products');
    try {
        console.log('Fetching sample products...');
        const sampleProducts = await getSampleProducts();
        console.log('Sample products fetched:', sampleProducts);
        res.json(sampleProducts);
    } catch (error) {
        console.error('Error fetching sample products:', error);
        res.status(500).json({ error: 'Failed to fetch sample products' });
    }
});

// Search endpoint
app.post('/api/search', async (req, res) => {
    console.log('Received search request:', req.body);
    const { searchTerm } = req.body;
    
    if (!searchTerm) {
        console.log('Search term missing');
        return res.status(400).json({ error: 'Voer een GLN nummer of bedrijfsnaam in' });
    }

    try {
        const isGLN = /^\d+$/.test(searchTerm);
        let results;

        console.log(`Searching for ${isGLN ? 'GLN' : 'company name'}: ${searchTerm}`);
        if (isGLN) {
            results = await queryCompanyByGLN(searchTerm);
        } else {
            results = await queryCompanyByName(searchTerm);
        }

        console.log('Search results:', results);
        if (results && results.length > 0) {
            res.json({
                found: true,
                type: isGLN ? 'gln' : 'name',
                companies: results
            });
        } else {
            res.json({ found: false });
        }
    } catch (error) {
        console.error('Database query error:', error);
        res.status(500).json({ error: 'Database query failed' });
    }
});

// Product search endpoint
app.post('/api/search-product', async (req, res) => {
    console.log('--- API Call: /api/search-product ---');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Timestamp:', new Date().toISOString());

    const { gln, gtin } = req.body;
    
    if (!gln || !gtin) {
        console.log('Error: GLN or GTIN missing');
        return res.status(400).json({ error: 'GLN en GTIN zijn verplicht' });
    }

    try {
        console.log(`Executing searchProduct with GLN: ${gln}, GTIN: ${gtin}`);
        const { rows: results, source } = await searchProduct(gln, gtin);
        console.log('Raw database query results:', JSON.stringify(results, null, 2));
        console.log('Source:', source);
        
        let response;
        if (results && results.length > 0) {
            response = { found: true, products: results, source };
            console.log(`Product found in ${source}. Number of results: ${results.length}`);
            if (source === 'tblproducts') {
                console.log('Product found in tblproducts. Service API call is not needed.');
            }
        } else {
            response = { found: false, source: 'none' };
            console.log('No products found in either search.');
        }
        
        console.log('Detailed API Response:', JSON.stringify(response, null, 2));
        res.json(response);
    } catch (error) {
        console.error('Database query error:', error);
        console.error('Error stack:', error.stack);
        const errorResponse = { error: 'Database query failed', details: error.message };
        console.log('Error Response:', JSON.stringify(errorResponse, null, 2));
        res.status(500).json(errorResponse);
    }

    console.log('--- End of API Call: /api/search-product ---');
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    console.log('Serving index.html');
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Start server
console.log('Starting server...');
console.log('Environment variables before server start:');
console.log('- PORT:', process.env.PORT);
console.log('- SERVICES_API_URL:', process.env.SERVICES_API_URL);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Environment variables after server start:');
    console.log('- PORT:', process.env.PORT);
    console.log('- SERVICES_API_URL:', process.env.SERVICES_API_URL);
});

export default app;
