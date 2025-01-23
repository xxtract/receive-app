const { pool, queryCompanyByGLN } = require('./db');

async function testDatabaseConnection() {
    let connection;
    try {
        console.log('Testing database connection...');
        console.log('Database config:', {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            database: process.env.DB_DATABASE
        });

        // Test basic connection
        connection = await pool.getConnection();
        console.log('Successfully connected to database');

        // Test charset
        const [charsetResult] = await connection.query('SHOW VARIABLES LIKE "character_set_client"');
        console.log('Character set:', charsetResult);

        // Test query with a known GLN
        console.log('\nTesting query with GLN: 8714529000008');
        const results = await queryCompanyByGLN('8714529000008');
        console.log('Query results:', results);
        
        if (results && results.length > 0) {
            console.log('Successfully found company:', results[0].companyName);
        } else {
            console.log('No company found for test GLN');
        }
    } catch (error) {
        console.error('Database connection/query failed:', error);
        if (error.code) console.error('Error code:', error.code);
        if (error.errno) console.error('Error number:', error.errno);
        if (error.sqlState) console.error('SQL state:', error.sqlState);
        if (error.sqlMessage) console.error('SQL message:', error.sqlMessage);
    } finally {
        if (connection) {
            try {
                connection.release();
                console.log('Database connection released');
            } catch (err) {
                console.error('Error releasing connection:', err);
            }
        }
        // Close the pool
        try {
            await pool.end();
            console.log('Database pool closed');
        } catch (err) {
            console.error('Error closing pool:', err);
        }
        process.exit();
    }
}

testDatabaseConnection();
