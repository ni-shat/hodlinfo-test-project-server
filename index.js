const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const axios = require('axios');

const app = express();
const port = 3000;

const cors = require('cors');
app.use(cors());

// PostgreSQL client setup
const pool = new Pool({
    user: 'postgres',           
    host: 'localhost',
    database: 'hodlinfo', 
    password: 'Nishat1234',  
    port: 5432,
});

app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));



// Function to fetch top 10 results from API
async function fetchTop10Results() {
    try {
        const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
        const tickers = response.data; // Data from API

        // Extract top 10 results
        const top10 = Object.keys(tickers)
            .slice(0, 10)
            .map(key => tickers[key]);

        return top10;
    } catch (error) {
        console.error('Error fetching data from API:', error);
        throw error;
    }
}

// Function to insert data into PostgreSQL
async function insertData(data) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const insertQuery = `
            INSERT INTO crypto_data (name, last, buy, sell, volume, base_unit)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        for (const item of data) {
            const values = [
                item.name,
                item.last,
                item.buy,
                item.sell,
                item.volume,
                item.base_unit
            ];
            await client.query(insertQuery, values);
        }
        await client.query('COMMIT');
    } catch (error) {
        console.error('Error inserting data:', error);
        await client.query('ROLLBACK');
    } finally {
        client.release();
    }
}

// API endpoint to trigger data fetch and store
app.get('/update-crypto-data', async (req, res) => {
    try {
        const top10Results = await fetchTop10Results();
        await insertData(top10Results);
        res.send('Data updated successfully');
    } catch (error) {
        res.status(500).send('Error updating data');
    }
});


// Route to fetch crypto data
app.get('/api/crypto-data', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM crypto_data');
        res.json(result.rows); 
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



app.get('/connect/telegram', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'connect-telegram.html'));
});

// Fallback for other routes (for SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
