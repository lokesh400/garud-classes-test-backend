// EJS route: Study page (purchased test series)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const http = require('http');
const https = require('https');

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

// Allow Razorpay checkout iframe to use sensors required for fraud detection
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=*, gyroscope=*, magnetometer=*, payment=*, camera=*'
  );
  // Prevent clickjacking on non-payment pages while allowing Razorpay iframe
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

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

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

function startKeepAlive(port) {
  setInterval(async () => {
    const result = await axios.get(`https://testportal.garudclasses.com/health`, { timeout: 5000 }).catch(err => {
      console.error('Keep-alive error:', err.message);
      return null;
    });
    if (result) console.log(`🔄 Keep-alive ping → ${result.status} OK`);
  }, 10000);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Garud Classes running at http://localhost:${PORT}`);
  startKeepAlive();
});