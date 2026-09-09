const mongoose = require('mongoose');
const dns = require('dns');

// On Windows, node's default DNS lookup can sometimes fail SRV lookups for mongodb+srv://
// Adding reliable DNS fallback ensures smooth connection to MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore if not supported in environment
}

/**
 * Connect to MongoDB instance (Atlas or Local) using Mongoose.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory_order_api';

  try {
    const conn = await mongoose.connect(uri, {
      dbName: 'inventory_order_api',
    });
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database] MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB instance.
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected cleanly.');
  } catch (error) {
    console.error(`[Database] Error during disconnect: ${error.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
