const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load JSON file with names
const filePath = path.join(__dirname, 'bulk-insert-names.json');
const names = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// API endpoint
const API_URL = 'http://localhost:3001/api/names';

// Normalize string (trim + uppercase)
function normalizeName(name) {
  return name.replace(/\s+/g, ' ').trim().toUpperCase();
}

// Deduplicate by name + type
const unique = new Set();
const uniqueNames = [];

for (const item of names) {
  const key = `${normalizeName(item.Name)}|${item.Type}`;
  if (!unique.has(key)) {
    unique.add(key);
    uniqueNames.push(item);
  }
}

// Insert into DB
async function insertNames() {
  for (const item of uniqueNames) {
    const payload = {
      name: normalizeName(item.Name),
      type: item.Type,
      priority: item.Priority || 'Yes',
      units: item.Units || ''
    };

    try {
      await axios.post(API_URL, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`✅ Inserted: ${payload.name} (${payload.type})`);
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message;
      console.error(`❌ ${payload.name} (${payload.type}): ${status || ''} ${msg}`);
    }
  }

  console.log(`\n🎯 Done. Total inserted: ${uniqueNames.length}`);
}

insertNames();