const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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
    name TEXT NOT NULL,
    type TEXT, -- 'vegetable', 'fruit', or null
    priority TEXT,
    units TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    UNIQUE(name, type)
  )
`);

db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS products`);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nameId INTEGER NOT NULL,
      topPriority TEXT,
      units TEXT,
      itemType TEXT,
      dateOfEntry TEXT,
      entryTime TEXT,
      FOREIGN KEY(nameId) REFERENCES names(id)
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
  const { name, type, priority, units } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  const query = `
    INSERT OR IGNORE INTO names (name, type, priority, units) 
    VALUES (?, ?, ?, ?)
  `;
  db.run(query, [name.trim(), type || null, priority || '', units || ''], function (err) {
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
  const { name, type, priority, units } = req.body;
  db.run(`
    UPDATE names SET name = ?, type = ?, priority = ?, units = ?
    WHERE id = ?
  `, [name, type, priority, units, req.params.id], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to update name', error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Name not found' });
    res.json({ message: 'Name updated successfully' });
  });
});

// ==================== PRODUCT ROUTES ====================
app.post('/api/products', (req, res) => {
  console.log('Incoming POST /api/products', req.body);
  const p = req.body;
  const values = [p.nameId, p.topPriority, p.units, p.itemType, p.dateOfEntry, p.entryTime];

  db.run(`
    INSERT INTO products (nameId, topPriority, units, itemType, dateOfEntry, entryTime)
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
  const values = [p.nameId, p.topPriority, p.units, p.itemType, p.dateOfEntry, p.entryTime, req.params.id];
  db.run(`
    UPDATE products SET nameId=?, topPriority=?, units=?, itemType=?, dateOfEntry=?, entryTime=?
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

// ==================== FIREBASE INITIALIZATION ====================
const admin = require('firebase-admin');

const serviceAccount = require(path.join(__dirname, 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

const cron = require('node-cron');
const localDb = new sqlite3.Database(path.join(__dirname, 'userdata', 'database.db'));

// ==================== DAILY SYNC TO FIREBASE ====================
// Manual trigger for testing
async function runManualSync() {
  console.log('[SYNC][Manual] Starting manual sync...');

  // --- Sync merchants table ---
  await new Promise((resolve, reject) => {
    localDb.all('SELECT * FROM clients', async (err, rows) => {
      if (err) {
        console.error('[SYNC][merchants] DB error:', err);
        return reject(err);
      }

      for (const row of rows) {
        try {
          await firestore.collection('merchants').doc(String(row.id)).set(row, { merge: false });
        } catch (e) {
          console.warn(`[SYNC][merchants] Failed to upload row ${row.id}:`, e.message);
        }
      }

      console.log('[SYNC][merchants] Synced', rows.length, 'rows.');
      resolve();
    });
  });

  // --- Sync bills ---
  await new Promise((resolve, reject) => {
    localDb.all('SELECT * FROM bills', async (err, rows) => {
      if (err) {
        console.error('[SYNC][bills] DB error:', err);
        return reject(err);
      }

      for (const row of rows) {
        try {
          const billData = { ...row };
          try {
            billData.billItems = JSON.parse(billData.billItems); // convert JSON string to array
          } catch (e) {
            console.warn(`[SYNC][bills] Failed to parse billItems for bill ID ${row.id}`);
          }

          await firestore.collection('bills').doc(String(row.id)).set(billData, { merge: false });
        } catch (e) {
          console.error(`[SYNC][bills] Failed to upload row ${row.id}:`, e.message);
        }
      }

      console.log('[SYNC][bills] Synced', rows.length, 'rows.');
      resolve();
    });
  });

  // --- Sync names ---
  await new Promise((resolve, reject) => {
    localDb.all('SELECT * FROM names', async (err, rows) => {
      if (err) {
        console.error('[SYNC][names] DB error:', err);
        return reject(err);
      }

      for (const row of rows) {
        try {
          await firestore.collection('names').doc(String(row.id)).set(row, { merge: false });
        } catch (e) {
          console.error(`[SYNC][names] Failed to upload row ${row.id}:`, e.message);
        }
      }

      console.log('[SYNC][names] Synced', rows.length, 'rows.');
      resolve();
    });
  });

  console.log('[SYNC][Manual] All tables synced successfully.');
}

// Run this manually for testing
runManualSync();

// ==================== MANUAL SYNC ENDPOINT ====================
app.post('/api/manual-sync', async (req, res) => {
  console.log('[SYNC][Manual] Triggered by frontend');

  try {
    // --- Sync merchants table ---
    await new Promise((resolve, reject) => {
      localDb.all('SELECT * FROM clients', async (err, rows) => {
        if (err) {
          console.error('[SYNC][merchants] DB error:', err);
          return reject('Error reading merchants');
        }

        for (const row of rows) {
          try {
            await firestore.collection('merchants').doc(String(row.id)).set(row, { merge: false });
          } catch (e) {
            console.warn(`[SYNC][merchants] Failed to upload row ${row.id}:`, e.message);
          }
        }

        console.log('[SYNC][merchants] Synced', rows.length, 'rows.');
        resolve(null);
      });
    });

    // --- Sync bills ---
    await new Promise((resolve, reject) => {
      localDb.all('SELECT * FROM bills', async (err, rows) => {
        if (err) {
          console.error('[SYNC][bills] DB error:', err);
          return reject('Error reading bills');
        }

        for (const row of rows) {
          try {
            const billData = { ...row };
            try {
              billData.billItems = JSON.parse(billData.billItems);
            } catch (e) {
              console.warn(`[SYNC][bills] Failed to parse billItems for bill ID ${row.id}`);
            }

            await firestore.collection('bills').doc(String(row.id)).set(billData, { merge: false });
          } catch (e) {
            console.warn(`[SYNC][bills] Failed to sync bill ${row.id}:`, e.message);
          }
        }

        console.log('[SYNC][bills] Synced', rows.length, 'rows.');
        resolve(null);
      });
    });

    // --- Sync names ---
    await new Promise((resolve, reject) => {
      localDb.all('SELECT * FROM names', async (err, rows) => {
        if (err) {
          console.error('[SYNC][names] DB error:', err);
          return reject('Error reading names');
        }

        for (const row of rows) {
          try {
            await firestore.collection('names').doc(String(row.id)).set(row, { merge: false });
          } catch (e) {
            console.warn(`[SYNC][names] Failed to sync name ${row.id}:`, e.message);
          }
        }

        console.log('[SYNC][names] Synced', rows.length, 'rows.');
        resolve(null);
      });
    });

    // ✅ Final response
    res.status(200).json({ message: 'Manual sync completed successfully.' });

  } catch (e) {
    console.error('[SYNC][Manual] Unexpected error:', e);
    res.status(500).json({ error: 'Manual sync failed.', details: e });
  }
});

// ==================== RESTORE FROM CLOUD ENDPOINT ====================
app.post('/api/restore-from-cloud', async (req, res) => {
  console.log('[RESTORE] Restoring data from Firebase...');

  try {
    // --- Restore merchants ---
    const merchantsSnap = await firestore.collection('merchants').get();
    for (const doc of merchantsSnap.docs) {
      const m = doc.data();

      await new Promise((resolve, reject) => {
        localDb.run(
          `INSERT OR REPLACE INTO clients (
            id, name, gstin, mobile, address, date, time
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            m.id,
            m.name || '',
            m.gstin || '',
            m.mobile || '',
            m.address || '',
            m.date || '',
            m.time || ''
          ],
          (err) => {
            if (err) {
              console.error(`[RESTORE][merchants] Failed for ID ${m.id}:`, err.message);
              return reject(err);
            }
            resolve(null);
          }
        );
      });
    }

    // --- Restore bills ---
    const billsSnap = await firestore.collection('bills').get();
    for (const doc of billsSnap.docs) {
      const bill = doc.data();
      const billItems = JSON.stringify(bill.billItems || []);

      await new Promise((resolve, reject) => {
        localDb.run(
          `INSERT OR REPLACE INTO bills (id, billDate, address, billItems) VALUES (?, ?, ?, ?)`,
          [bill.id, bill.billDate, bill.address || '', billItems],
          (err) => {
            if (err) {
              console.error(`[RESTORE][bills] Failed for ID ${bill.id}:`, err.message);
              return reject(err);
            }
            resolve(null);
          }
        );
      });
    }

    // --- Restore names ---
    const namesSnap = await firestore.collection('names').get();
    for (const doc of namesSnap.docs) {
      const name = doc.data();

      await new Promise((resolve, reject) => {
        localDb.run(
          `INSERT OR REPLACE INTO names (
            id, firstName, lastName, city, mobile, phone,
            email, landmark, address1, date, time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            name.id,
            name.firstName || '',
            name.lastName || '',
            name.city || '',
            name.mobile || '',
            name.phone || '',
            name.email || '',
            name.landmark || '',
            name.address1 || '',
            name.date || '',
            name.time || ''
          ],
          (err) => {
            if (err) {
              console.error(`[RESTORE][names] Failed for ID ${name.id}:`, err.message);
              return reject(err);
            }
            resolve(null);
          }
        );
      });
    }

    console.log('[RESTORE] Completed.');
    res.status(200).json({ message: 'Data restored from cloud.' });
  } catch (err) {
    console.error('[RESTORE] Error:', err);
    res.status(500).json({ error: 'Restore failed.', details: err.message });
  }
});

app.post('/api/sync-name/:id', (req, res) => {
  const id = Number(req.params.id);
  localDb.get('SELECT * FROM names WHERE id = ?', [id], async (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Name not found' });
    }

    try {
      await firestore.collection('names').doc(String(row.id)).set(row, { merge: false });
      res.json({ message: 'Synced name ' + id });
    } catch (e) {
      res.status(500).json({ error: 'Firestore write failed', details: e.message });
    }
  });
});
