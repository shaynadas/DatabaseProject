const express = require('express');
const { Client } = require('pg');
const path = require('path');
const { Parser } = require('json2csv');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Configure multer for file uploads (stores files temporarily in "uploads/")
const upload = multer({ dest: 'uploads/' });

// Serve static files from "public" folder
app.use(express.static('public'));

// PostgreSQL connection setup
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

// Serve home.html on "/"
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Serve import.html
app.get('/import.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'import.html'));
});

// Serve export.html
app.get('/export.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'export.html'));
});

// API route to get all users as JSON
app.get('/api/users', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Error fetching users');
  }
});

// Export users as CSV
app.get('/export-users', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users');
    const users = result.rows;

    const fields = ['id', 'name', 'email', 'birthdate'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(users);

    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    res.send(csv);
  } catch (err) {
    console.error('CSV Export Error:', err);
    res.status(500).send('Could not export data');
  }
});

// Import users from uploaded CSV file
app.post('/import-users', upload.single('csvFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const results = [];
  const filePath = req.file.path;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => {
      results.push(data);
    })
    .on('end', async () => {
      try {
        for (const row of results) {
          // Extract and sanitize fields (adjust names if your CSV headers differ)
          const id = row.id ? parseInt(row.id) : null;
          const name = row.name || null;
          const email = row.email || null;
          const birthdate = row.birthdate || null;

          if (!id || !name || !email) {
            // Skip rows missing required fields
            continue;
          }

          await client.query(
            `INSERT INTO users (id, name, email, birthdate) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE 
             SET name = EXCLUDED.name,
                 email = EXCLUDED.email,
                 birthdate = EXCLUDED.birthdate`,
            [id, name, email, birthdate]
          );
        }
        fs.unlinkSync(filePath); // Delete uploaded file
        res.send('Import successful');
      } catch (err) {
        console.error('Error inserting data:', err);
        fs.unlinkSync(filePath);
        res.status(500).send('Error importing data');
      }
    })
    .on('error', (err) => {
      console.error('Error reading CSV:', err);
      fs.unlinkSync(filePath);
      res.status(400).send('Invalid CSV file');
    });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
