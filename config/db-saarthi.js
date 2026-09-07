const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Explicitly load the atlas-credentials.env file for the secondary DB connection
dotenv.config({ path: path.join(__dirname, '../atlas-credentials.env') });

const saarthiUri = process.env.SAARTHI_MONGODB_URI;

if (!saarthiUri) {
  console.error('Error: Secondary MongoDB URI is missing from atlas-credentials.env or .env');
  process.exit(1);
}

// Create a separate connection specifically for Saarthi messages/images
const saarthiDbConnection = mongoose.createConnection(saarthiUri);

saarthiDbConnection.on('connected', () => {
  console.log(`Secondary Saarthi MongoDB Connected: ${saarthiDbConnection.host}`);
});

saarthiDbConnection.on('error', (err) => {
  console.error(`Secondary Saarthi MongoDB Error: ${err.message}`);
});

module.exports = saarthiDbConnection;
