import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

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

// Create bills table
db.run(`
  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientName TEXT,
    address TEXT,
    billNumber TEXT,
    billDate TEXT,
    discount REAL,
    totalAmount REAL,
    finalAmount REAL,
    billItems TEXT
  )
`);

// POST endpoint to save a bill
app.post('/api/bills', (req, res) => {
  const {
    clientName,
    address,
    billNumber,
    billDate,
    discount,
    totalAmount,
    finalAmount,
    billItems
  } = req.body;

  const query = `
    INSERT INTO bills (
      clientName, address, billNumber, billDate, discount,
      totalAmount, finalAmount, billItems
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    clientName,
    address,
    billNumber,
    billDate,
    discount,
    totalAmount,
    finalAmount,
    JSON.stringify(billItems)
  ], function (err) {
    if (err) {
      console.error('Error saving bill:', err);
      res.status(500).json({ message: 'Failed to save bill' });
    } else {
      res.status(201).json({ message: 'Bill saved successfully', id: this.lastID });
    }
  });
});

// ✅ Get the latest bill number
app.get('/api/bills/latest', (req, res) => {
  db.get('SELECT billNumber FROM bills ORDER BY id DESC LIMIT 1', [], (err, row) => {
    if (err) {
      console.error('Error fetching latest bill number:', err);
      return res.status(500).json({ message: 'Failed to fetch latest bill number' });
    }

    if (!row || !row.billNumber) {
      return res.status(200).json({ billNumber: '001' }); // Start at 001 if no bill exists
    }

    // Increment bill number (assuming format like 001, 002, ...)
    const currentNumber = parseInt(row.billNumber);
    const nextNumber = (currentNumber + 1).toString().padStart(3, '0');

    res.status(200).json({ billNumber: nextNumber });
  });
});

app.get('/api/bills', (req, res) => {
  db.all('SELECT * FROM bills ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching bills:', err);
      return res.status(500).json({ message: 'Failed to fetch bills' });
    }
    res.status(200).json(rows);
  });
});

app.get('/api/bills/:billNumber', (req, res) => {
  const { billNumber } = req.params;
  db.get('SELECT * FROM bills WHERE billNumber = ?', [billNumber], (err, row) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch bill' });
    if (!row) return res.status(404).json({ message: 'Bill not found' });

    // Parse billItems JSON
    row.billItems = JSON.parse(row.billItems || '[]');
    res.json(row);
  });
});

//Edit bills
app.put('/api/bills/:billNumber', (req, res) => {
  const { billNumber } = req.params;
  const {
    clientName, address, billDate, discount,
    totalAmount, finalAmount, billItems
  } = req.body;

  const query = `
    UPDATE bills SET
      clientName = ?, address = ?, billDate = ?, discount = ?,
      totalAmount = ?, finalAmount = ?, billItems = ?
    WHERE billNumber = ?
  `;

  const values = [
    clientName, address, billDate, discount,
    totalAmount, finalAmount, JSON.stringify(billItems),
    billNumber
  ];

  db.run(query, values, function (err) {
    if (err) {
      console.error('❌ Failed to update bill:', err.message);
      return res.status(500).json({ message: 'Database update error', error: err.message });
    }

    if (this.changes === 0) {
      console.warn('⚠️ No bill updated: not found');
      return res.status(404).json({ message: 'Bill not found' });
    }

    res.status(200).json({ message: 'Bill updated successfully' });
  });
});



// Create barcodes table
db.run(`
  CREATE TABLE IF NOT EXISTS barcodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productName TEXT,
    mrp REAL,
    category TEXT,
    expiryDays INTEGER,
    expiryDate TEXT,
    barcode TEXT
  )
`);

// POST endpoint to save barcodes
app.post('/api/barcodes', (req, res) => {
  const products = req.body;

  if (!Array.isArray(products)) {
    return res.status(400).json({ message: 'Invalid data format. Expected an array of products.' });
  }

  const stmt = db.prepare(`
    INSERT INTO barcodes (productName, mrp, category, expiryDays, expiryDate, barcode)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.serialize(() => {
    try {
      products.forEach(p => {
        if (
          !p.productName || typeof p.mrp !== 'number' ||
          !p.category || !p.expiryDate || !p.barcode
        ) {
          console.warn('Skipping invalid product:', p);
          return;
        }

        stmt.run(
          p.productName,
          p.mrp,
          p.category,
          p.expiryDays || 0,
          p.expiryDate,
          p.barcode,
          err => {
            if (err) {
              console.error('Failed to insert barcode for product:', p.productName, err.message);
            } else {
              console.log('Inserted barcode for:', p.productName);
            }
          }
        );
      });

      stmt.finalize(err => {
        if (err) {
          console.error('Finalize error:', err.message);
          return res.status(500).json({ message: 'Database finalize error', error: err.message });
        }

        res.status(201).json({ message: 'Products saved successfully.' });
      });

    } catch (e) {
      console.error('Unexpected error in /api/barcodes:', e.message);
      res.status(500).json({ message: 'Unexpected server error', error: e.message });
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

// ✅ GET a product by ID
app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, row) => {
    if (err) {
      console.error('Error fetching product:', err);
      res.status(500).json({ message: 'Failed to fetch product' });
    } else if (!row) {
      res.status(404).json({ message: 'Product not found' });
    } else {
      res.status(200).json(row);
    }
  });
});

// ✅ PUT update a product by ID
app.put('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const {
    vegName,
    topPriority,
    units,
    itemType,
    dateOfEntry,
    entryTime
  } = req.body;

  const query = `
    UPDATE products SET
      vegName = ?,
      topPriority = ?,
      units = ?,
      itemType = ?,
      dateOfEntry = ?,
      entryTime = ?
    WHERE id = ?
  `;
  const values = [vegName, topPriority, units, itemType, dateOfEntry, entryTime, productId];

  db.run(query, values, function (err) {
    if (err) {
      console.error('Error updating product:', err);
      res.status(500).json({ message: 'Failed to update product' });
    } else {
      res.status(200).json({ message: 'Product updated successfully' });
    }
  });
});

// ✅ DELETE endpoint for deleting a product by ID
app.delete('/api/products/:id', (req, res) => {
  const productId = req.params.id;

  const query = `DELETE FROM products WHERE id = ?`;

  db.run(query, [productId], function (err) {
    if (err) {
      console.error('Error deleting product:', err);
      return res.status(500).json({ message: 'Failed to delete product' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  });
});


// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


// Email
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
      <br/>
      <h3>Items:</h3>
      <ul>
        ${bill.billItems.map(item => `
          <li>${item.productName} - Qty: ${item.quantity}, Price: ₹${item.price}, Total: ₹${item.total}</li>
        `).join('')}
      </ul>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Email sending failed:', error);
      return res.status(500).json({ message: 'Failed to send email' });
    } else {
      console.log('Email sent:', info.response);
      return res.status(200).json({ message: 'Email sent successfully' });
    }
  });
});