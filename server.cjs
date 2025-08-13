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
      billItems TEXT,
      billType TEXT
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
  const { name, type, priority, units, mrp, expiryDays, barcode } = req.body;
  const id = req.params.id;

  if (barcode && barcode.trim() !== '') {
    db.get('SELECT id FROM names WHERE barcode = ? AND id != ?', [barcode.trim(), id], (err, row) => {
      if (err) {
        console.error('❌ Barcode check failed:', err.message);
        return res.status(500).json({ message: 'Database error' });
      }

      if (row) {
        return res.status(400).json({ message: '❌ Barcode already exists for another product' });
      }

      return doUpdate();
    });
  } else {
    return doUpdate();
  }

  function doUpdate() {
    db.run(`
      UPDATE names 
      SET name = ?, type = ?, priority = ?, units = ?, mrp = ?, expiryDays = ?, barcode = ?
      WHERE id = ?
    `, [name, type, priority, units, mrp || null, expiryDays || null, barcode || '', id], function (err) {
      if (err) {
        console.error('❌ Update failed:', err.message);
        return res.status(500).json({ message: 'Failed to update name', error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json({ message: '✅ Product updated successfully' });
    });
  }
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
// Create bill
app.post('/api/bills', (req, res) => {
  const b = req.body;
  const query = `
    INSERT INTO bills (
      clientName, address, billNumber, billDate, discount, totalAmount, finalAmount, description, billItems, billType
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    b.clientName,
    b.address,
    b.billNumber,
    b.billDate,
    b.discount,
    b.totalAmount,
    b.finalAmount,
    b.description || '',
    JSON.stringify(b.billItems),
    b.billType || '' // store billType
  ];

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ message: 'Failed to save bill' });
    res.status(201).json({ message: 'Bill saved successfully', id: this.lastID });
  });
});

// Update bill
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
      description = ?,
      billType = ?
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
    b.billType || '',
    req.params.billNumber
  ];

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ message: 'Failed to update bill' });
    if (this.changes === 0) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill updated successfully' });
  });
});

// Get latest bill number
app.get('/api/bills/latest', (req, res) => {
  db.get('SELECT billNumber FROM bills ORDER BY id DESC LIMIT 1', [], (err, row) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch latest bill number' });
    const next = row?.billNumber ? (parseInt(row.billNumber) + 1).toString().padStart(3, '0') : '001';
    res.json({ billNumber: next });
  });
});

// Get all bills
app.get('/api/bills', (req, res) => {
  db.all('SELECT * FROM bills ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch bills' });
    res.json(rows);
  });
});

// Get bill by number
app.get('/api/bills/:billNumber', (req, res) => {
  db.get('SELECT * FROM bills WHERE billNumber = ?', [req.params.billNumber], (err, row) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch bill' });
    if (!row) return res.status(404).json({ message: 'Bill not found' });
    row.billItems = JSON.parse(row.billItems || '[]');
    res.json(row);
  });
});

// Delete bill
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
  const bill = req.body || {};

  // --- Helpers ---
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const inr = (n) =>
    typeof n === 'number'
      ? n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
      : esc(n ?? '');

  const numberOrZero = (n) => (typeof n === 'number' ? n : 0);

  const hasItems = Array.isArray(bill.billItems) && bill.billItems.length > 0;
  const descriptionHtml =
    bill.description && String(bill.description).trim() !== ''
      ? esc(bill.description).replace(/\n/g, '<br/>')
      : '';

  console.log('📩 Incoming email bill:', JSON.stringify(bill, null, 2));

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER || 'jkumarshahu5@gmail.com',
      pass: process.env.MAIL_PASS || 'vobd eiax vdrd yvbh', // ← use an App Password via env var
    },
  });

  // Build Items table (if any)
  const itemsTable = hasItems
    ? `
      <h3 style="margin:24px 0 8px;color:#4B0082;">Items</h3>
      <table role="table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;background:#ffffff;border:1px solid #ececec;">
        <thead>
          <tr>
            <th align="left" style="padding:10px 12px;border-bottom:1px solid #ececec;font:600 13px/1.2 system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#4B0082;">#</th>
            <th align="left" style="padding:10px 12px;border-bottom:1px solid #ececec;font:600 13px/1.2 system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#4B0082;">Product</th>
            <th align="right" style="padding:10px 12px;border-bottom:1px solid #ececec;font:600 13px/1.2 system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#4B0082;">Qty</th>
            <th align="right" style="padding:10px 12px;border-bottom:1px solid #ececec;font:600 13px/1.2 system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#4B0082;">Price</th>
            <th align="right" style="padding:10px 12px;border-bottom:1px solid #ececec;font:600 13px/1.2 system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#4B0082;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${bill.billItems
            .map((item, idx) => {
              const qty = numberOrZero(item?.quantity);
              const price = numberOrZero(item?.price);
              const total = typeof item?.total === 'number' ? item.total : qty * price;
              return `
                <tr>
                  <td style="padding:10px 12px;border-top:1px solid #f5f5f5;font:500 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#333;">${idx + 1}</td>
                  <td style="padding:10px 12px;border-top:1px solid #f5f5f5;font:500 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#333;">${esc(item?.productName)}</td>
                  <td align="right" style="padding:10px 12px;border-top:1px solid #f5f5f5;font:500 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#333;">${esc(qty)}</td>
                  <td align="right" style="padding:10px 12px;border-top:1px solid #f5f5f5;font:500 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#333;">${inr(price)}</td>
                  <td align="right" style="padding:10px 12px;border-top:1px solid #f5f5f5;font:600 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#111;">${inr(total)}</td>
                </tr>`;
            })
            .join('')}
        </tbody>
      </table>`
    : '';

  // Build Description block (if no items but we have a description)
  const descriptionBlock =
    !hasItems && descriptionHtml
      ? `
        <h3 style="margin:24px 0 8px;color:#4B0082;">Description</h3>
        <div style="padding:12px;border:1px solid #ececec;background:#fff;border-radius:8px;color:#333;font:500 14px system-ui,Segoe UI,Roboto,Helvetica,Arial;">
          ${descriptionHtml}
        </div>`
      : '';

  const billNumber = esc(bill.billNumber);
  const clientName = esc(bill.clientName);
  const address = esc(bill.address);
  const billDate = esc(bill.billDate);
  const totalAmount = inr(numberOrZero(bill.totalAmount));
  const discountPct = typeof bill.discount === 'number' ? bill.discount.toFixed(2) + '%' : esc(bill.discount ?? '0%');
  const finalAmount = inr(numberOrZero(bill.finalAmount));

  const mailOptions = {
    from: process.env.MAIL_USER || 'jkumarshahu5@gmail.com',
    to: bill.email || '', // custom email if provided
    subject: `Invoice - ${billNumber}`,
    html: `
      <div style="margin:0;padding:0;background:#f6f7fb;">
        <div style="max-width:720px;margin:0 auto;padding:24px;">
          <!-- Card -->
          <div style="background:#ffffff;border-radius:14px;box-shadow:0 4px 16px rgba(0,0,0,0.06);overflow:hidden;border:1px solid #f0eef7;">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#5a2ea6,#4B0082);padding:20px 24px;">
              <h2 style="margin:0;color:#ffffff;font:700 20px/1.2 system-ui,Segoe UI,Roboto,Helvetica,Arial;">Invoice — ${billNumber}</h2>
              <div style="margin-top:6px;color:#e8dcff;font:500 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;">${clientName}</div>
            </div>

            <!-- Body -->
            <div style="padding:20px 24px;">
              <!-- Meta -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px;">
                <tr>
                  <td style="padding:6px 0;font:600 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#4B0082;">Client</td>
                  <td style="padding:6px 0;font:500 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#333;">${clientName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font:600 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#4B0082;">Address</td>
                  <td style="padding:6px 0;font:500 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#333;">${address}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font:600 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#4B0082;">Date</td>
                  <td style="padding:6px 0;font:500 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#333;">${billDate}</td>
                </tr>
              </table>

              <!-- Totals grid -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;border-spacing:12px 0;margin:12px 0 4px;">
                <tr>
                  <td style="background:#f7f4ff;border:1px solid #ede7ff;border-radius:10px;padding:12px;">
                    <div style="font:600 12px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#4B0082;letter-spacing:.2px;">Total Amount</div>
                    <div style="margin-top:4px;font:700 18px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#111;">${totalAmount}</div>
                  </td>
                  <td style="background:#f7f4ff;border:1px solid #ede7ff;border-radius:10px;padding:12px;">
                    <div style="font:600 12px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#4B0082;letter-spacing:.2px;">Margin</div>
                    <div style="margin-top:4px;font:700 18px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#111;">${discountPct}</div>
                  </td>
                  <td style="background:#efeaff;border:1px solid #e1d8ff;border-radius:10px;padding:12px;">
                    <div style="font:600 12px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#4B0082;letter-spacing:.2px;">Final Total</div>
                    <div style="margin-top:4px;font:700 18px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#111;">${finalAmount}</div>
                  </td>
                </tr>
              </table>

              ${itemsTable}
              ${descriptionBlock}

              <!-- Footer note -->
              <div style="margin-top:24px;padding-top:12px;border-top:1px dashed #e8e6f3;color:#666;font:500 12px system-ui,Segoe UI,Roboto,Helvetica,Arial;">
                This is a system‑generated invoice. For queries, reply to this email.
              </div>
            </div>
          </div>

          <!-- Tiny footer -->
          <div style="text-align:center;color:#9a96ab;font:500 12px system-ui,Segoe UI,Roboto,Helvetica,Arial;margin-top:14px;">
            © ${new Date().getFullYear()} J.T. Fruits & Vegetables. All rights reserved.
          </div>
        </div>
      </div>
    `,
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
