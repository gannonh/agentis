const mongoose = require('mongoose');

// Global teardown to ensure all connections are closed
afterAll(async () => {
  // Close all mongoose connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  // Force close all connections
  await mongoose.disconnect();
  
  // Clear any remaining timers
  jest.clearAllTimers();
});