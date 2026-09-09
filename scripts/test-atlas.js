require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

// Configure public DNS resolvers to handle SRV lookups reliably on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.log('DNS setServers notice:', e.message);
}

async function testAtlas() {
  console.log('Testing connection to MongoDB Atlas...');
  const uri = process.env.MONGODB_URI;
  console.log('URI:', uri.replace(/:([^:@]+)@/, ':****@'));

  try {
    const conn = await mongoose.connect(uri, {
      dbName: 'inventory_order_api',
      serverSelectionTimeoutMS: 10000,
    });
    console.log('SUCCESS: Successfully connected to MongoDB Atlas!');
    console.log('Host:', conn.connection.host);
    console.log('Database name:', conn.connection.name);
    console.log('Connection ready state:', conn.connection.readyState);
    await mongoose.disconnect();
    console.log('Disconnected cleanly.');
  } catch (err) {
    console.error('Atlas Connection Error:', err.message);
  }
}

testAtlas();
