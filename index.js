const express = require('express');
const { Client } = require('pg');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { Parser } = require('json2csv');
const app = express();
const PORT = 3000;

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

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/import.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'import.html')));
app.get('/export.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'export.html')));

app.get('/api/users', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching users');
  }
});

app.get('/export', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users');
    const jsonData = result.rows;

    const fields = ['id', 'name', 'email', 'birthdate'];
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

app.post('/import', upload.single('csvFile'), async (req, res) => {
  const filePath = req.file.path;
  const filter = req.body.filterOption || 'all';
  const rowRange = req.body.rowRange || '';
  const csv = require('csv-parser');
  const results = [];

  // Parse rowRange string into a set of row indices
  const parseRowRange = (input) => {
    const indices = new Set();
    if (!input.trim()) return null;

    input.split(',').forEach(part => {
      part = part.trim();
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = start; i <= end; i++) indices.add(i);
      } else {
        const num = parseInt(part);
        if (!isNaN(num)) indices.add(num);
      }
    });

    return indices;
  };

  const allowedRows = parseRowRange(rowRange);

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const rowNum = i + 1;

          if (allowedRows && !allowedRows.has(rowNum)) continue;

          const email = row.email || '';
          const birthdate = row.birthdate || null;

          if (filter === 'gmail' && !email.toLowerCase().endsWith('@gmail.com')) continue;
          if (filter === 'after2000' && (!birthdate || new Date(birthdate) <= new Date('2000-01-01'))) continue;

          await client.query(
            'INSERT INTO users (name, email, birthdate) VALUES ($1, $2, $3)',
            [row.name, row.email, birthdate]
          );
        }

        fs.unlinkSync(filePath);
        res.send('Import successful');
      } catch (err) {
        console.error('Import error:', err);
        res.status(500).send('Error importing data');
      }
    });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
