import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use CLI argument or default file
const inputFile = process.argv[2] || 'bulk-insert-names.json';
const filePath = path.join(__dirname, inputFile);

// Load and parse JSON
let names;
try {
  const data = fs.readFileSync(filePath, 'utf-8');
  names = JSON.parse(data);
} catch (err) {
  console.error(`❌ Failed to read or parse JSON file: ${filePath}`);
  process.exit(1);
}

const API_URL = 'http://localhost:3001/api/names';

// Normalize name
function normalizeName(name) {
  return name.replace(/\s+/g, ' ').trim().toUpperCase();
}

const uniqueNames = names.map(item => ({
  barcode: item.Barcode || '',
  name: normalizeName(item.Name || ''),
  type: item.Type || 'vegetable',
  priority: item.Priority || 'Yes',
  units: item.Units || '',
}));


async function insertNames() {
  console.log(`🚀 Starting insert of ${uniqueNames.length} entries...\n`);
  let success = 0, fail = 0;

  for (const item of uniqueNames) {
    try {
      await axios.post(API_URL, item, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      console.log(`✅ Inserted: ${item.name}`);
      success++;
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message;
      const raw = error.toJSON ? JSON.stringify(error.toJSON()) : error.message;
      console.error(`❌ Failed: ${item.name} (${status || 'NO STATUS'}) - ${msg}`);
      console.error(`➡️ Full error: ${raw}`);
      fail++;
    }
  }

  console.log(`\n🎯 Done. Inserted: ${success}, Failed: ${fail}`);
}

insertNames();
