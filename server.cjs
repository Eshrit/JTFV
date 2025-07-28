const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

const userDataPath = process.env.USER_DATA_PATH || path.join(__dirname, 'userdata');
const dbPath = path.join(userDataPath, 'database.db');
const defaultDbPath = process.env.DEFAULT_DB_PATH || (
  process.resourcesPath
    ? path.join(process.resourcesPath, 'app_data', 'database.db')
    : path.join(__dirname, 'database.db')
);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

if (!fs.existsSync(dbPath)) {
  try {
    if (fs.existsSync(defaultDbPath)) {
      fs.copyFileSync(defaultDbPath, dbPath);
      console.log('✅ Copied default database to userData path');
    } else {
      console.warn('⚠️ Default database not found at:', defaultDbPath);
    }
  } catch (err) {
    console.error('❌ Error copying default database:', err);
  }
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('Error opening database:', err);
  console.log('Connected to SQLite database:', dbPath);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    Username TEXT UNIQUE, 
    password TEXT)
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

db.run(`
  CREATE TABLE IF NOT EXISTS names (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT,
    name TEXT NOT NULL,
    type TEXT,
    priority TEXT,
    units TEXT,
    mrp REAL,
    expiryDays INTEGER,
    createdAt TEXT DEFAULT (datetime('now')),
    UNIQUE(barcode)
  )
`);

  db.serialize(() => {
    db.run(`DROP TABLE IF EXISTS products`);

    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        Barcode TEXT NOT NULL,
        topPriority TEXT,
        units TEXT,
        itemType TEXT,
        dateOfEntry TEXT,
        entryTime TEXT,
        FOREIGN KEY(Barcode) REFERENCES names(barcode)
      )
    `);
  });

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
      description TEXT,
      billItems TEXT
    )
    `);

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

});

// ==================== CLIENT ROUTES ====================
app.post('/api/clients', (req, res) => {
  const c = req.body;

  const query = `
    INSERT INTO clients (
      firstName, middleName, lastName, phone, mobile, fax, email,
      clientType, address1, address2, area, subArea, city, landmark,
      franchise, dateOfEntry, entryTime
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    c.firstName, c.middleName, c.lastName, c.phone, c.mobile, c.fax, c.email,
    c.clientType, c.address1, c.address2, c.area, c.subArea, c.city, c.landmark,
    c.franchise, c.dateOfEntry, c.entryTime
  ];

  db.run(query, values, function (err) {
    if (err) {
      console.error('❌ Failed to insert client:', err.message);
      return res.status(500).json({ message: 'Failed to save client', error: err.message });
    }
    res.status(201).json({ message: 'Client saved successfully', id: this.lastID });
  });
});

app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch clients', error: err.message });
    res.json(rows);
  });
});

// ==================== NAME ROUTES ====================
app.get('/api/names', (req, res) => {
  db.all('SELECT * FROM names ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch names', error: err.message });
    res.json(rows);
  });
});

// Get all names
app.post('/api/names', (req, res) => {
  const { name, type, priority, units, barcode, mrp, expiryDays } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  const query = `
    INSERT INTO names (barcode, name, type, priority, units, mrp, expiryDays) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(query, [barcode || '', name.trim(), type || null, priority || '', units || '', mrp || null, expiryDays || null], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to add name', error: err.message });
    res.status(201).json({ message: 'Name added', id: this.lastID });
  });
});

// Get a single name by ID
app.get('/api/names/:id', (req, res) => {
  db.get('SELECT * FROM names WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch name' });
    if (!row) return res.status(404).json({ message: 'Name not found' });
    res.json(row);
  });
});

// Update a name
app.put('/api/names/:id', (req, res) => {
  const { name, type, priority, units, mrp, expiryDays } = req.body;
  db.run(`
    UPDATE names SET name = ?, type = ?, priority = ?, units = ?, mrp = ?, expiryDays = ?
    WHERE id = ?
  `, [name, type, priority, units, mrp || null, expiryDays || null, req.params.id], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to update name', error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Name not found' });
    res.json({ message: 'Name updated successfully' });
  });
});

// // DELETE /api/names/vegetables — deletes only vegetable rows
// app.delete('/api/names/vegetables', (req, res) => {
//   db.run(`DELETE FROM names WHERE type = 'vegetable'`, function (err) {
//     if (err) {
//       console.error('❌ Failed to delete vegetable entries:', err.message);
//       res.status(500).json({ message: 'Failed to delete vegetables' });
//     } else {
//       console.log('🥦 Deleted old vegetable entries');
//       res.status(200).json({ message: 'Vegetables deleted' });
//     }
//   });
// });

// ==================== PRODUCT ROUTES ====================
app.post('/api/products', (req, res) => {
  console.log('Incoming POST /api/products', req.body);
  const p = req.body;
  const values = [p.Barcode, p.topPriority, p.units, p.itemType, p.dateOfEntry, p.entryTime];

  db.run(`
    INSERT INTO products (Barcode, topPriority, units, itemType, dateOfEntry, entryTime)
    VALUES (?, ?, ?, ?, ?, ?)`, values, function (err) {
    if (err) {
      console.error('❌ SQL Error:', err); // 👈 Log it
      return res.status(500).json({ message: 'Failed to save product', error: err.message });
    }
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
  const values = [p.Barcode, p.topPriority, p.units, p.itemType, p.dateOfEntry, p.entryTime, req.params.id];
  db.run(`
    UPDATE products SET Barcode=?, topPriority=?, units=?, itemType=?, dateOfEntry=?, entryTime=?
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

// ==================== BILL ROUTES ====================
app.post('/api/bills', (req, res) => {
  const b = req.body;
  const query = `INSERT INTO bills (clientName, address, billNumber, billDate, discount, totalAmount, finalAmount, description, billItems)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [
    b.clientName,
    b.address,
    b.billNumber,
    b.billDate,
    b.discount,
    b.totalAmount,
    b.finalAmount,
    b.description || '',
    JSON.stringify(b.billItems)
  ];

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ message: 'Failed to save bill' });
    res.status(201).json({ message: 'Bill saved successfully', id: this.lastID });
  });
});

app.put('/api/bills/:billNumber', (req, res) => {
  const b = req.body;

  const query = `
    UPDATE bills SET
      clientName = ?, 
      address = ?, 
      billDate = ?, 
      discount = ?, 
      totalAmount = ?, 
      finalAmount = ?, 
      billItems = ?, 
      description = ?
    WHERE billNumber = ?
  `;

  const values = [
    b.clientName,
    b.address,
    b.billDate,
    b.discount,
    b.totalAmount,
    b.finalAmount,
    JSON.stringify(b.billItems || []),
    b.description || '',
    req.params.billNumber
  ];

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
  db.run('DELETE FROM bills WHERE billNumber = ?', [req.params.billNumber], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to delete bill' });
    if (this.changes === 0) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  });
});



// ==================== BARCODE ROUTES ====================
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

// ==================== AUTH ROUTES ====================
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

// ==================== EMAIL BILL ROUTE ====================
app.post('/api/send-bill', (req, res) => {
  const bill = req.body;

  console.log('📩 Incoming email bill:', JSON.stringify(bill, null, 2));

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'jkumarshahu5@gmail.com',
      pass: 'vobd eiax vdrd yvbh'
    }
  });

  const mailOptions = {
    from: 'jkumarshahu5@gmail.com',
    to: bill.email || '', // 👈 use custom email if provided
    subject: `Invoice - ${bill.billNumber}`,
    html: `
      <h2 style="color: #4B0082;">Invoice - ${bill.billNumber}</h2>
      <p><strong style="color: #4B0082;">Client:</strong> ${bill.clientName}</p>
      <p><strong style="color: #4B0082;">Address:</strong> ${bill.address}</p>
      <p><strong style="color: #4B0082;">Date:</strong> ${bill.billDate}</p>
      <p><strong style="color: #4B0082;">Total Amount:</strong> ₹${bill.totalAmount.toFixed(2)}</p>
      <p><strong style="color: #4B0082;">Discount:</strong> ${bill.discount.toFixed(2)}%</p>
      <p><strong style="color: #4B0082;">Total:</strong> ₹${bill.finalAmount.toFixed(2)}</p>
      <br/>
      ${Array.isArray(bill.billItems) && bill.billItems.length > 0
        ? `<h3 style="color: #4B0082;">Items:</h3>` +
          bill.billItems.map((item, index) => `
            <p>${index + 1}. ${item.productName} - Qty: ${item.quantity}, Price: ₹${item.price}, Total: ₹${item.total}</p>
          `).join('')
        : (bill.description && bill.description.trim() !== '')
          ? `<h3 style="color: #4B0082;">Description:</h3><p>${bill.description.replace(/\n/g, '<br/>')}</p>`
          : `<p style="color: gray;">No items or description provided.</p>`
      }
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

// ==================== SERVE ANGULAR APP ====================
const isElectron = !!process.versions.electron;

const angularDistPath = isElectron
  ? path.join(process.resourcesPath, 'app_data', 'dist', 'my-login-app')
  : path.join(__dirname, 'dist', 'my-login-app');

app.use(express.static(angularDistPath));

app.get('*', (req, res) => {
  const indexPath = path.join(angularDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('❌ index.html not found at', indexPath);
    res.status(500).send('Frontend not found. Make sure Angular build was included.');
  }
});

// ==================== START SERVER WITH SHUTDOWN HANDLING ====================
const server = app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

function shutdown() {
  console.log('\n🛑 Gracefully shutting down server...');
  server.close(() => {
    console.log('✅ Server closed. Exiting process.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown();
});
process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`);
});
