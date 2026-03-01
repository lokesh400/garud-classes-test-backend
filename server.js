// EJS route: Study page (purchased test series)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const Purchase = require('./models/Purchase');
const { auth } = require('./middleware/auth');

// Connect to database
connectDB();

const app = express();


// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

// app.use(cors());
app.use(cors({
  origin: [
    "http://localhost:5000",
    "http://localhost:3000",
    "https://test.garudclasses.com"
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Page routes (EJS views)
app.use('/', require('./routes/pages'));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/chapters', require('./routes/chapters'));
app.use('/api/topics', require('./routes/topics'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/test-series', require('./routes/testSeries'));
const paymentsRouter = require('./routes/payments');
const purchaseRouter = require('./routes/purchase');
app.use('/api/payments', paymentsRouter);
app.use('/api/purchase', purchaseRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Garud Classes Test Portal API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
