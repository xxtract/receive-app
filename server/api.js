import express from 'express';
import { pool } from '../database.js';
const router = express.Router();

router.post('/checkAndAddAuditMeasurement', async (req, res) => {
  try {
    const { globalTradeItemNumber, informationProvider, orderNumber, productDescription } = req.body;
    
    // Check if a measurement record exists
    const checkQuery = `
      SELECT measurementID 
      FROM tblauditmeasurements 
      WHERE 
        status = 'open'
        AND globalTradeItemNumber = ?
        AND informationProvider = ?
      ORDER BY measurementID DESC
      LIMIT 1;
    `;
    
    const [checkResults] = await pool.query(checkQuery, [globalTradeItemNumber, informationProvider]);
    
    if (checkResults.length > 0) {
      return res.json({ message: `Existing open measurement found for GTIN: ${globalTradeItemNumber}` });
    }
    
    // If no record exists, add a new one
    const insertQuery = `
      INSERT INTO tblauditmeasurements (
        orderNumber, 
        globalTradeItemNumber, 
        informationProvider, 
        productDescription, 
        status, 
        created_at, 
        updated_at
      )
      VALUES (?, ?, ?, ?, 'open', NOW(), NOW());
    `;
    
    await pool.query(insertQuery, [orderNumber, globalTradeItemNumber, informationProvider, productDescription]);
    res.json({ message: `New audit measurement added for GTIN: ${globalTradeItemNumber}` });
  } catch (error) {
    console.error('Error in checkAndAddAuditMeasurement:', error);
    res.status(500).json({ error: 'Er is een fout opgetreden bij het controleren en toevoegen van de auditmetingen.' });
  }
});

export default router;