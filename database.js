// @ts-nocheck
import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function queryCompanyByGLN(gln) {
  const [rows] = await pool.execute('SELECT companyName, informationProvider, finishCode FROM tblcompanies WHERE informationProvider = ?', [gln]);
  return rows;
}

export async function queryCompanyByName(name) {
  const [rows] = await pool.execute('SELECT companyName, informationProvider, finishCode FROM tblcompanies WHERE companyName LIKE ? GROUP BY informationProvider LIMIT 10', [`%${name}%`]);
  return rows;
}

export async function searchProduct(gln, gtin) {
  const paddedGtin = gtin.replace(/\D/g, '').padStart(14, '0');
  try {
    // Original query
    const originalQuery = `
      SELECT DISTINCT
        '2562210' as orderNumber,
        ah.id as hierarchyId,
        ti_other.id as tradeItemId,
        ti_other.productDescription,
        ci_other.hierarchyKey,
        ti_other.globalTradeItemNumber,
        s.translation AS tradeItemUnitDescriptor,
        IF(ti_other.isTradeItemAConsumerUnit = 'true', 'CE', 'HE') as productType,
        ti_other.quantityOfChildren,
        ti_other.id
      FROM tradeItem AS t
      JOIN catalogueItem AS ci ON (ci.tradeItemID = t.id)
      JOIN articleHierarchy AS ah ON (ah.hierarchyKey = ci.hierarchyKey)
      JOIN catalogueItem AS ci_other ON (ci_other.hierarchyKey = ci.hierarchyKey)
      JOIN tradeItem AS ti_other ON (
        ti_other.id = ci_other.tradeItemID
        AND ti_other.tradeItemUnitDescriptor <> 'PACK_OR_INNER_PACK'
        AND ti_other.informationProvider = ?
      )
      JOIN translations AS s ON (
        s.code = ti_other.tradeItemUnitDescriptor
        AND s.language = 'nl'
        AND s.category = 'XXTRACT_tradeItemUnitDescriptorCode'
      )
      WHERE t.globalTradeItemNumber = ?
      ORDER BY
      ah.id,
      FIELD(ti_other.tradeItemUnitDescriptor, 'BASE_UNIT_OR_EACH', 'PACK_OR_INNER_PACK', 'CASE')
    `;
    const [originalRows] = await pool.execute(originalQuery, [gln, paddedGtin]);
    console.log('Original search query:', originalQuery);
    console.log('Original search parameters:', [gln, paddedGtin]);
    console.log('Original search results:', originalRows);

    if (originalRows.length > 0) {
      return { rows: originalRows, source: 'tradeItem' };
    }

    // Alternative query if no results found
    const alternativeQuery = `
      SELECT
        p.orderNumber,
        '' AS hierarchyId,
        p.productID AS tradeItemId,
        p.productDescription,
        '' AS hierarchyKey,
        p.globalTradeItemNumber,
        IF(p.productType = 'CE', 'basiseenheid', 'omdoos') AS tradeItemUnitDescriptor,
        p.productType,
        '' AS quantityOfChildren,
        NULL as id
      FROM tblproducts AS p
      JOIN tblorders AS o ON (
        o.orderNumber = p.orderNumber
        AND o.orderService IN ('LOG', 'LABELLOG', 'AUDITLOG'))
      WHERE
        p.productStatus IN ('open', 'expected', 'requested')
        AND p.informationProvider = ?
        AND p.globalTradeItemNumber = ?
    `;
    const [alternativeRows] = await pool.execute(alternativeQuery, [gln, paddedGtin]);
    console.log('Alternative search query:', alternativeQuery);
    console.log('Alternative search parameters:', [gln, paddedGtin]);
    console.log('Alternative search results:', alternativeRows);

    return { rows: alternativeRows, source: 'tblproducts' };
  } catch (error) {
    console.error('Error in searchProduct:', error);
    throw error;
  }
}

export async function getSampleProducts(limit = 5) {
  try {
    const [rows] = await pool.execute('SELECT * FROM tradeItem LIMIT ?', [limit]);
    return rows;
  } catch (error) {
    console.error('Error in getSampleProducts:', error);
    throw error;
  }
}

export async function processReception(products, measureService = null, serviceChecker = null) {
  const connection = await pool.getConnection();
  const queries = [];
  const auditMeasurementRecords = [];
  const measureServiceResults = [];
  try {
    await connection.beginTransaction();

    console.log('Received products for processing:', JSON.stringify(products, null, 2));

    for (const product of products) {
      const processedProduct = {
        ...product,
        globalTradeItemNumber: product.globalTradeItemNumber.trim(),
        informationProvider: product.informationProvider.trim(),
        productType: product.productType.trim(),
        productDescription: product.productDescription || '',
        tradeItemId: product.tradeItemId === "null" ? null : (product.tradeItemId || null),
        finishCode: product.finishCode || null,
        orderNumber: product.orderNumber || '2562210'
      };
      console.log('Processing product:', JSON.stringify(processedProduct, null, 2));
        
      // Insert into tblproductsinbound
      const inboundQuery = `
        INSERT INTO tblproductsinbound
        (globalTradeItemNumber, informationProvider, productType,
        orderServiceLabelPhoto, orderServicePackinfo, orderServicePhoto,
        dateTimeReceived, productID, orderFinishCode, orderNumber)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const inboundValues = [
        processedProduct.globalTradeItemNumber,
        processedProduct.informationProvider,
        processedProduct.productType,
        processedProduct.serviceLabelImage ? 1 : 0,
        processedProduct.servicePackInfo ? 1 : 0,
        processedProduct.servicePackshot ? 1 : 0,
        new Date(processedProduct.dateTime),
        processedProduct.tradeItemId,
        processedProduct.finishCode,
        processedProduct.orderNumber
      ];

      // Log the inbound query and values
      console.log('Executing inbound query:', inboundQuery);
      console.log('With inbound values:', JSON.stringify(inboundValues, null, 2));

      queries.push({ query: inboundQuery, values: inboundValues });

      const [inboundResult] = await connection.execute(inboundQuery, inboundValues);
      console.log('Inbound query execution result:', JSON.stringify(inboundResult, null, 2));

      // Check for existing audit measurement record
      const checkAuditQuery = `
        SELECT measurementID
        FROM tblauditmeasurements
        WHERE
          status = 'open'
          AND globalTradeItemNumber = ?
          AND informationProvider = ?
        ORDER BY measurementID DESC
        LIMIT 1
      `;
      const checkAuditValues = [product.globalTradeItemNumber.trim(), product.informationProvider.trim()];
      
      console.log('Executing check audit query:', checkAuditQuery);
      console.log('With check audit values:', JSON.stringify(checkAuditValues, null, 2));

      queries.push({ query: checkAuditQuery, values: checkAuditValues });

      const [existingAuditRecords] = await connection.execute(checkAuditQuery, checkAuditValues);
      console.log('Check audit query result:', JSON.stringify(existingAuditRecords, null, 2));

      if (existingAuditRecords.length === 0) {
        // Insert new audit measurement record
        const insertAuditQuery = `
          INSERT INTO tblauditmeasurements (
            orderNumber,
            globalTradeItemNumber,
            informationProvider,
            productDescription,
            status,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, 'open', NOW(), NOW())
        `;
        const insertAuditValues = [
          processedProduct.orderNumber,
          processedProduct.globalTradeItemNumber,
          processedProduct.informationProvider,
          processedProduct.productDescription,
        ];

        console.log('Executing insert audit query:', insertAuditQuery);
        console.log('With insert audit values:', JSON.stringify(insertAuditValues, null, 2));

        queries.push({ query: insertAuditQuery, values: insertAuditValues });

        const [insertAuditResult] = await connection.execute(insertAuditQuery, insertAuditValues);
        console.log('Insert audit query result:', JSON.stringify(insertAuditResult, null, 2));

        auditMeasurementRecords.push({
          orderNumber: processedProduct.orderNumber,
          globalTradeItemNumber: processedProduct.globalTradeItemNumber,
          informationProvider: processedProduct.informationProvider,
          productDescription: processedProduct.productDescription,
        });
      } else {
        console.log('Existing audit measurement record found, skipping insertion');
      }

      // Always handle MEASURE service status
      try {
        console.log('Handling MEASURE service for product:', JSON.stringify(processedProduct, null, 2));
        if (measureService && serviceChecker) {
          const servicesResult = await measureService.handleAllServices(processedProduct, serviceChecker, processedProduct.hierarchyId || '');
          console.log('Services handling result:', JSON.stringify(servicesResult, null, 2));
          
          measureServiceResults.push({
            globalTradeItemNumber: processedProduct.globalTradeItemNumber,
            serviceResults: servicesResult?.serviceResults,
            measureServiceResult: servicesResult?.measureServiceResult,
            auditResult: servicesResult?.auditResult
          });
          
          if (servicesResult === null) {
            console.warn(`Services handling failed for product: ${processedProduct.globalTradeItemNumber}`);
          } else {
            if (servicesResult.serviceResults.some(r => r.result === null)) {
              console.warn(`Failed to update some services for product: ${processedProduct.globalTradeItemNumber}`);
            }
            if (servicesResult.measureServiceResult === null) {
              console.warn(`Failed to add or update MEASURE service for product: ${processedProduct.globalTradeItemNumber}`);
            }
            if (servicesResult.auditResult === null) {
              console.warn(`Failed to add or update audit measurement for product: ${processedProduct.globalTradeItemNumber}`);
            }
          }
        } else {
          console.log('MeasureService or ServiceChecker not provided, skipping MEASURE service handling');
          measureServiceResults.push({
            globalTradeItemNumber: processedProduct.globalTradeItemNumber,
            measureServiceResult: null,
            auditResult: null
          });
        }
      } catch (error) {
        console.error('Error handling MEASURE service:', error);
        measureServiceResults.push({
          globalTradeItemNumber: processedProduct.globalTradeItemNumber,
          measureServiceResult: null,
          auditResult: null,
          error: error.message
        });
        // Continue processing other products even if MEASURE service update fails
      }

      // Handle Scenario 3: Update product status in tblproducts
      if (product.source === 'tblproducts' && product.tradeItemId) {
        const updateQuery = `
          UPDATE tblproducts
          SET productStatus = 'received'
          WHERE productID = ?
        `;
        await connection.execute(updateQuery, [product.tradeItemId]);
      }

      // Ensure required values are valid
      const requiredFields = [
        product.globalTradeItemNumber,
        product.informationProvider,
        product.productType,
        product.dateTime
      ];
      
      if (requiredFields.some(value => !value || value === '')) {
        throw new Error(`Invalid product data: ${JSON.stringify(product)}`);
      }
    }

    await connection.commit();
    console.log(`Successfully processed ${products.length} products`);
    return {
      success: true,
      message: `${products.length} products processed successfully`,
      queries,
      auditMeasurementRecords,
      measureServiceResults,
      measureServiceFailures: measureServiceResults.filter(r => r.measureServiceResult === null).map(r => r.globalTradeItemNumber),
      auditMeasurementFailures: measureServiceResults.filter(r => r.auditResult === null).map(r => r.globalTradeItemNumber)
    };
  } catch (error) {
    await connection.rollback();
    console.error('Error in processReception:', error);
    return {
      success: false,
      message: `Error processing products: ${error.message}`,
      queries,
      auditMeasurementRecords,
      measureServiceResults,
      measureServiceFailures: measureServiceResults.filter(r => r.measureServiceResult === null).map(r => r.globalTradeItemNumber),
      auditMeasurementFailures: measureServiceResults.filter(r => r.auditResult === null).map(r => r.globalTradeItemNumber)
    };
  } finally {
    connection.release();
  }
}
