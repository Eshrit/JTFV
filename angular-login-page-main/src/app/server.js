import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

// ✅ Enable CORS
app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ✅ Handle preflight OPTIONS
app.options('*', cors());

// ✅ Middleware
app.use(bodyParser.json());

// ✅ SQLite setup
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT,
        middleName TEXT,
        lastName TEXT,
        phone TEXT,
        mobile TEXT,
        fax TEXT,
        email TEXT,
        clientType TEXT,
        address1 TEXT,
        address2 TEXT,
        area TEXT,
        subArea TEXT,
        city TEXT,
        landmark TEXT,
        franchise TEXT,
        dateOfEntry TEXT,
        entryTime TEXT
      )
    `);
  }
});

app.post('/api/clients', (req, res) => {
  const client = req.body;
  const query = `
    INSERT INTO clients (
      firstName, middleName, lastName, phone, mobile, fax, email, clientType,
      address1, address2, area, subArea, city, landmark, franchise,
      dateOfEntry, entryTime
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    client.firstName, client.middleName, client.lastName, client.phone, client.mobile,
    client.fax, client.email, client.clientType,
    client.address1, client.address2, client.area, client.subArea,
    client.city, client.landmark, client.franchise,
    client.dateOfEntry, client.entryTime
  ];

  db.run(query, values, function (err) {
    if (err) {
      console.error('Error saving client:', err);
      res.status(500).json({ message: 'Failed to save client' });
    } else {
      res.status(201).json({ message: 'Client saved successfully', id: this.lastID });
    }
  });
});

// Get all clients
app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients', [], (err, rows) => {
    if (err) {
      console.error('Error fetching clients:', err);
      res.status(500).json({ message: 'Failed to fetch clients' });
    } else {
      res.status(200).json(rows);
    }
  });
});

// ✅ SQLite setup - Add Products Table
db.run(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vegName TEXT,
    topPriority TEXT,
    units TEXT,
    itemType TEXT,
    dateOfEntry TEXT,
    entryTime TEXT
  )
`);

// ✅ POST endpoint for adding a new product
app.post('/api/products', (req, res) => {
  const product = req.body;
  const query = `
    INSERT INTO products (
      vegName, topPriority, units, itemType, dateOfEntry, entryTime
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [
    product.vegName, product.topPriority, product.units, product.itemType,
    product.dateOfEntry, product.entryTime
  ];

  db.run(query, values, function (err) {
    if (err) {
      console.error('Error saving product:', err);
      res.status(500).json({ message: 'Failed to save product' });
    } else {
      res.status(201).json({ message: 'Product saved successfully', id: this.lastID });
    }
  });
});

// ✅ GET endpoint to retrieve all products
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) {
      console.error('Error fetching products:', err);
      res.status(500).json({ message: 'Failed to fetch products' });
    } else {
      res.status(200).json(rows);
    }
  });
});


// ✅ Register endpoint
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (row) {
      console.log('User already exists');
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err) => {
      if (err) {
        console.error('Error saving user:', err);
        return res.status(500).json({ message: 'Failed to register user' });
      }
      console.log('User registered:', email);
      res.status(201).json({ message: 'User registered successfully' });
    });
  });
});

// ✅ Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      console.error('Error querying database:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!row) {
      console.log('Invalid email or password');
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Compare the hashed password
    const match = await bcrypt.compare(password, row.password);
    if (match) {
      console.log('Login successful');
      res.status(200).json({ message: 'Login successful' });
    } else {
      console.log('Invalid email or password');
      res.status(400).json({ message: 'Invalid email or password' });
    }
  });
});


// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
