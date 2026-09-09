require('dotenv').config();
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/database');

const PORT = process.env.PORT || 5000;

let server;

// Start server after successful database connection
const startServer = async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      console.log(`[Server] Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error(`[Server] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown on termination signals
const shutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
