require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Helper function to make API requests
async function makeApiRequest(endpoint, data) {
    try {
        const response = await axios.post(`${process.env.SERVICES_API_URL}${endpoint}`, data);
        return response.data;
    } catch (error) {
        console.error('API request error:', error.message);
        throw new Error('API request failed');
    }
}

// Config endpoint
app.get('/api/config', (req, res) => {
    console.log('Config request received');
    console.log('SERVICES_API_URL:', process.env.SERVICES_API_URL);
    
    if (!process.env.SERVICES_API_URL) {
        console.error('SERVICES_API_URL not found in environment variables');
        return res.status(500).json({ error: 'Services API URL not configured' });
    }

    res.json({
        servicesApiUrl: process.env.SERVICES_API_URL
    });
});

// Search endpoint
app.post('/api/search', async (req, res) => {
    const { searchTerm } = req.body;
    
    if (!searchTerm) {
        return res.status(400).json({ error: 'Voer een GLN nummer of bedrijfsnaam in' });
    }

    try {
        const isGLN = /^\d+$/.test(searchTerm);
        const endpoint = isGLN ? '/search-by-gln' : '/search-by-name';
        const results = await makeApiRequest(endpoint, { searchTerm });

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
        console.error('Search error:', error.message);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Product search endpoint
app.post('/api/search-product', async (req, res) => {
    const { gln, gtin } = req.body;
    
    if (!gln || !gtin) {
        return res.status(400).json({ error: 'GLN en GTIN zijn verplicht' });
    }

    try {
        const results = await makeApiRequest('/search-product', { gln, gtin });

        if (results && results.length > 0) {
            res.json({ found: true, products: results });
        } else {
            res.json({ found: false });
        }
    } catch (error) {
        console.error('Product search error:', error.message);
        res.status(500).json({ error: 'Product search failed' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Use browser to access http://localhost:${port}`);
    console.log('Environment variables:');
    console.log('- PORT:', process.env.PORT);
    console.log('- SERVICES_API_URL:', process.env.SERVICES_API_URL);
});
