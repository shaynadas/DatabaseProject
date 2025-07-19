const express = require('express');
const { Client } = require('pg');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { Parser } = require('json2csv'); // ✅ Required for CSV export

const app = express();
const PORT = 3000;

// PostgreSQL client
const client = new Client({
  user: 'shaynadas',
  host: 'localhost',
  database: 'test',
  password: 'shriyan123',
  port: 5432,
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL successfully!'))
  .catch(err => console.error('Connection error', err.stack));

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// File upload setup (for import)
const upload = multer({ dest: 'uploads/' });

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/import.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'import.html')));
app.get('/export.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'export.html')));

// Get users for homepage
app.get('/api/users', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching users');
  }
});

// ✅ Export route (CSV download)
app.get('/export', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users');
    const jsonData = result.rows;

    const fields = ['id', 'name', 'email']; // Adjust field names as needed
    const parser = new Parser({ fields });
    const csv = parser.parse(jsonData);

    res.header('Content-Type', 'text/csv');
    res.attachment('export.csv');
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).send('Export failed');
  }
});

// ✅ Import route
app.post('/import', upload.single('csvFile'), async (req, res) => {
  const filePath = req.file.path;
  const csv = require('csv-parser');
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        for (const row of results) {
          await client.query('INSERT INTO users (name, email) VALUES ($1, $2)', [row.name, row.email]);
        }
        fs.unlinkSync(filePath);
        res.send('Import successful');
      } catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).send('Error importing data');
      }
    });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
