// ✅ Required modules
import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

// ✅ Middleware
app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(bodyParser.json());

// ✅ SQLite DB setup
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) return console.error('Error opening database:', err);
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
      firstName TEXT, middleName TEXT, lastName TEXT, phone TEXT,
      mobile TEXT, fax TEXT, email TEXT, clientType TEXT,
      address1 TEXT, address2 TEXT, area TEXT, subArea TEXT,
      city TEXT, landmark TEXT, franchise TEXT, dateOfEntry TEXT, entryTime TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vegName TEXT, topPriority TEXT, units TEXT,
      itemType TEXT, dateOfEntry TEXT, entryTime TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerName TEXT,
      date TEXT,
      items TEXT,
      totalAmount REAL,
      createdAt TEXT
    )
  `);
});

// ✅ Clients API
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
    client.fax, client.email, client.clientType, client.address1, client.address2,
    client.area, client.subArea, client.city, client.landmark, client.franchise,
    client.dateOfEntry, client.entryTime
  ];

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ message: 'Failed to save client' });
    res.status(201).json({ message: 'Client saved successfully', id: this.lastID });
  });
});

app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch clients' });
    res.status(200).json(rows);
  });
});

// ✅ Products API
app.post('/api/products', (req, res) => {
  const product = req.body;
  const values = [
    product.vegName, product.topPriority, product.units, product.itemType,
    product.dateOfEntry, product.entryTime
  ];

  db.run(`
    INSERT INTO products (
      vegName, topPriority, units, itemType, dateOfEntry, entryTime
    ) VALUES (?, ?, ?, ?, ?, ?)`, values, function (err) {
    if (err) return res.status(500).json({ message: 'Failed to save product' });
    res.status(201).json({ message: 'Product saved', id: this.lastID });
  });
});

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch products' });
    res.status(200).json(rows);
  });
});

app.get('/api/products/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch product' });
    if (!row) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(row);
  });
});

app.put('/api/products/:id', (req, res) => {
  const id = req.params.id;
  const { vegName, topPriority, units, itemType, dateOfEntry, entryTime } = req.body;

  db.run(`
    UPDATE products SET
      vegName = ?, topPriority = ?, units = ?, itemType = ?,
      dateOfEntry = ?, entryTime = ?
    WHERE id = ?
  `, [vegName, topPriority, units, itemType, dateOfEntry, entryTime, id], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to update product' });
    res.status(200).json({ message: 'Product updated successfully' });
  });
});

app.delete('/api/products/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to delete product' });
    if (this.changes === 0) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json({ message: 'Product deleted successfully' });
  });
});

// ✅ Bills API
app.post('/api/bills', (req, res) => {
  const { customerName, date, items, totalAmount, createdAt } = req.body;

  db.run(`
    INSERT INTO bills (customerName, date, items, totalAmount, createdAt)
    VALUES (?, ?, ?, ?, ?)`, [
    customerName, date,
    JSON.stringify(items),
    totalAmount,
    createdAt || new Date().toISOString()
  ], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to save bill' });
    res.status(201).json({ message: 'Bill saved', id: this.lastID });
  });
});

app.get('/api/bills', (req, res) => {
  db.all('SELECT * FROM bills', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch bills' });
    const parsed = rows.map(row => ({ ...row, items: JSON.parse(row.items) }));
    res.status(200).json(parsed);
  });
});

app.get('/api/bills/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM bills WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch bill' });
    if (!row) return res.status(404).json({ message: 'Bill not found' });
    row.items = JSON.parse(row.items);
    res.status(200).json(row);
  });
});

app.put('/api/bills/:id', (req, res) => {
  const id = req.params.id;
  const { customerName, date, items, totalAmount, createdAt } = req.body;

  db.run(`
    UPDATE bills SET
      customerName = ?, date = ?, items = ?, totalAmount = ?, createdAt = ?
    WHERE id = ?
  `, [
    customerName, date,
    JSON.stringify(items),
    totalAmount,
    createdAt || new Date().toISOString(),
    id
  ], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to update bill' });
    if (this.changes === 0) return res.status(404).json({ message: 'Bill not found' });
    res.status(200).json({ message: 'Bill updated successfully' });
  });
});

app.delete('/api/bills/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM bills WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to delete bill' });
    if (this.changes === 0) return res.status(404).json({ message: 'Bill not found' });
    res.status(200).json({ message: 'Bill deleted successfully' });
  });
});

// ✅ Auth endpoints
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (row) return res.status(400).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashed], (err) => {
      if (err) return res.status(500).json({ message: 'Failed to register user' });
      res.status(201).json({ message: 'User registered successfully' });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (!row) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    res.status(200).json({ message: 'Login successful' });
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
