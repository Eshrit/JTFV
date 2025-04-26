import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup
const dbPath = process.env.NODE_ENV === 'production'
  ? path.join(process.resourcesPath, 'database.db')
  : path.join(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('Error opening database:', err);
  console.log('Connected to SQLite database');

  // Tables setup
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, firstName TEXT, middleName TEXT, lastName TEXT, phone TEXT, mobile TEXT, fax TEXT, email TEXT, clientType TEXT, address1 TEXT, address2 TEXT, area TEXT, subArea TEXT, city TEXT, landmark TEXT, franchise TEXT, dateOfEntry TEXT, entryTime TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, vegName TEXT, topPriority TEXT, units TEXT, itemType TEXT, dateOfEntry TEXT, entryTime TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS bills (id INTEGER PRIMARY KEY AUTOINCREMENT, clientName TEXT, address TEXT, billNumber TEXT, billDate TEXT, discount REAL, totalAmount REAL, finalAmount REAL, billItems TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS barcodes (id INTEGER PRIMARY KEY AUTOINCREMENT, productName TEXT, mrp REAL, category TEXT, expiryDays INTEGER, expiryDate TEXT, barcode TEXT)`);
});

// CLIENT ROUTES
app.post('/api/clients', (req, res) => {
  const c = req.body;
  const query = `
    INSERT INTO clients (
      firstName, middleName, lastName, phone, mobile, fax, email, clientType,
      address1, address2, area, subArea, city, landmark, franchise,
      dateOfEntry, entryTime
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [c.firstName, c.middleName, c.lastName, c.phone, c.mobile, c.fax, c.email, c.clientType,
    c.address1, c.address2, c.area, c.subArea, c.city, c.landmark, c.franchise, c.dateOfEntry, c.entryTime];

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ message: 'Failed to save client' });
    res.status(201).json({ message: 'Client saved successfully', id: this.lastID });
  });
});

app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch clients' });
    res.json(rows);
  });
});

// PRODUCT ROUTES
app.post('/api/products', (req, res) => {
  const p = req.body;
  const values = [p.vegName, p.topPriority, p.units, p.itemType, p.dateOfEntry, p.entryTime];
  db.run(`
    INSERT INTO products (vegName, topPriority, units, itemType, dateOfEntry, entryTime)
    VALUES (?, ?, ?, ?, ?, ?)`, values, function (err) {
    if (err) return res.status(500).json({ message: 'Failed to save product' });
    res.status(201).json({ message: 'Product saved successfully', id: this.lastID });
  });
});

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch products' });
    res.json(rows);
  });
});

app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch product' });
    if (!row) return res.status(404).json({ message: 'Product not found' });
    res.json(row);
  });
});

app.put('/api/products/:id', (req, res) => {
  const p = req.body;
  const values = [p.vegName, p.topPriority, p.units, p.itemType, p.dateOfEntry, p.entryTime, req.params.id];
  db.run(`
    UPDATE products SET vegName=?, topPriority=?, units=?, itemType=?, dateOfEntry=?, entryTime=?
    WHERE id=?`, values, function (err) {
    if (err) return res.status(500).json({ message: 'Failed to update product' });
    res.json({ message: 'Product updated successfully' });
  });
});

app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to delete product' });
    if (this.changes === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  });
});

// BILL ROUTES
app.post('/api/bills', (req, res) => {
  const b = req.body;
  const query = `INSERT INTO bills (clientName, address, billNumber, billDate, discount, totalAmount, finalAmount, billItems)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [b.clientName, b.address, b.billNumber, b.billDate, b.discount, b.totalAmount, b.finalAmount, JSON.stringify(b.billItems)];

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ message: 'Failed to save bill' });
    res.status(201).json({ message: 'Bill saved successfully', id: this.lastID });
  });
});

app.put('/api/bills/:billNumber', (req, res) => {
  const b = req.body;
  const query = `
    UPDATE bills SET
      clientName=?, address=?, billDate=?, discount=?,
      totalAmount=?, finalAmount=?, billItems=?
    WHERE billNumber=?`;
  const values = [b.clientName, b.address, b.billDate, b.discount, b.totalAmount, b.finalAmount, JSON.stringify(b.billItems), req.params.billNumber];

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ message: 'Failed to update bill' });
    if (this.changes === 0) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill updated successfully' });
  });
});

app.get('/api/bills/latest', (req, res) => {
  db.get('SELECT billNumber FROM bills ORDER BY id DESC LIMIT 1', [], (err, row) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch latest bill number' });
    const next = row?.billNumber ? (parseInt(row.billNumber) + 1).toString().padStart(3, '0') : '001';
    res.json({ billNumber: next });
  });
});

app.get('/api/bills', (req, res) => {
  db.all('SELECT * FROM bills ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch bills' });
    res.json(rows);
  });
});

app.get('/api/bills/:billNumber', (req, res) => {
  db.get('SELECT * FROM bills WHERE billNumber = ?', [req.params.billNumber], (err, row) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch bill' });
    if (!row) return res.status(404).json({ message: 'Bill not found' });
    row.billItems = JSON.parse(row.billItems || '[]');
    res.json(row);
  });
});

app.delete('/api/bills/:billNumber', (req, res) => {
  const { billNumber } = req.params;
  db.run('DELETE FROM bills WHERE billNumber = ?', [billNumber], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to delete bill' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.status(200).json({ message: 'Bill deleted successfully' });
  });
});

// BARCODE ROUTES
app.post('/api/barcodes', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ message: 'Expected array of barcodes' });

  const stmt = db.prepare(`INSERT INTO barcodes (productName, mrp, category, expiryDays, expiryDate, barcode) VALUES (?, ?, ?, ?, ?, ?)`);
  db.serialize(() => {
    items.forEach(p => {
      if (!p.productName || !p.mrp || !p.barcode) return;
      stmt.run(p.productName, p.mrp, p.category, p.expiryDays, p.expiryDate, p.barcode);
    });
    stmt.finalize(err => {
      if (err) return res.status(500).json({ message: 'Finalize error', error: err.message });
      res.status(201).json({ message: 'Barcodes saved' });
    });
  });
});

// AUTH ROUTES
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (row) return res.status(400).json({ message: 'Email already exists' });
    const hashed = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashed], err => {
      if (err) return res.status(500).json({ message: 'Failed to register user' });
      res.status(201).json({ message: 'User registered' });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (!row || !(await bcrypt.compare(password, row.password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    res.json({ message: 'Login successful' });
  });
});

// EMAIL BILL
app.post('/api/send-bill', (req, res) => {
  const bill = req.body;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'riteshshahu2603@gmail.com',
      pass: 'mgag eird shhi xgvo'
    }
  });

  const mailOptions = {
    from: 'riteshshahu2600@gmail.com',
    to: 'riteshshahu2600@gmail.com',
    subject: `Invoice - ${bill.billNumber}`,
    html: `
      <h2>Invoice - ${bill.billNumber}</h2>
      <p><strong>Client:</strong> ${bill.clientName}</p>
      <p><strong>Address:</strong> ${bill.address}</p>
      <p><strong>Date:</strong> ${bill.billDate}</p>
      <p><strong>Total:</strong> ₹${bill.finalAmount.toFixed(2)}</p>
      <h3>Items:</h3>
      <ul>
        ${bill.billItems.map(item => `
          <li>${item.productName} - Qty: ${item.quantity}, Price: ₹${item.price}, Total: ₹${item.total}</li>
        `).join('')}
      </ul>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) return res.status(500).json({ message: 'Failed to send email', error });
    res.json({ message: 'Email sent successfully' });
  });
});

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Serve Angular app (only in production mode)
const angularDistPath = path.join(__dirname, 'dist', 'my-login-app');

app.use(express.static(angularDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(angularDistPath, 'index.html'));
});



// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
