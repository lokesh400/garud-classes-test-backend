// EJS route: Study page (purchased test series)
require('dotenv').config();
const express       = require('express');
const cors          = require('cors');
const session       = require('express-session');
const MongoStore   = require('connect-mongo').MongoStore;
const passport      = require('./config/passport'); // configures passport strategies
const helmet        = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB     = require('./config/db');
const axios         = require('axios');

const { auth } = require('./middleware/auth');

// Connect to database
connectDB();

const app    = express();
const isProd = process.env.NODE_ENV === 'production';


// ── Security headers (helmet) ───────────────────────────────────────────────────
// CSP is disabled here so existing inline scripts and Tailwind/Razorpay CDN
// resources keep working. Enable & tighten with a nonce strategy when ready.
app.use(helmet({
  contentSecurityPolicy:    false, // configure separately when ready
  crossOriginEmbedderPolicy: false, // Razorpay iframe requires this off
}));

// ── View engine ─────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

// ── CORS ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5000',
    'http://localhost:3000',
    'https://testportal.garudclasses.com',
  ],
  credentials: true,
}));

// ── Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── NoSQL injection sanitizer ─────────────────────────────────────────────────────
// Strips $ and . from req.body, req.params, req.query
app.use(mongoSanitize());

// ── Startup env guard ─────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('FATAL: SESSION_SECRET env variable is not set. Add it to your .env file.');
  process.exit(1);
}

// ── Session ─────────────────────────────────────────────────────────────────
app.use(session({
  name:              'sid',              // don't leak framework name via cookie
  secret:            process.env.JWT_SECRET,
  resave:            false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl:   process.env.MONGODB_URI,
    ttl:        7 * 24 * 60 * 60,        // 7 days (seconds)
    autoRemove: 'native',
  }),
  cookie: {
    httpOnly: true,                      // JS cannot read the cookie
    secure:   isProd,                    // HTTPS-only in production
    sameSite: 'strict',                  // CSRF protection
    maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 days (ms)
  },
}));

// ── Passport ─────────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Razorpay sensor permissions & clickjack protection ─────────────────────
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=*, gyroscope=*, magnetometer=*, payment=*, camera=*'
  );
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// ── Inject canonical page URL into every EJS template ───────────────────────
app.use((req, res, next) => {
  res.locals.pageUrl = 'https://testportal.garudclasses.com' + req.path;
  next();
});

// ── Page routes (EJS views) ────────────────────────────────────────────────────
app.use('/', require('./routes/pages'));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/subjects',    require('./routes/subjects'));
app.use('/api/chapters',    require('./routes/chapters'));
app.use('/api/topics',      require('./routes/topics'));
app.use('/api/questions',   require('./routes/questions'));
app.use('/api/tests',       require('./routes/tests'));
app.use('/api/test-series', require('./routes/testSeries'));
app.use('/api/reports',     require('./routes/reports'));
app.use('/api/payments',    require('./routes/payments'));
app.use('/api/purchase',    require('./routes/purchase'));

app.get('/health', (req, res) => res.status(200).send('OK'));

function startKeepAlive() {
  setInterval(async () => {
    const result = await axios.get('https://testportal.garudclasses.com/health', { timeout: 5000 }).catch(err => {
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