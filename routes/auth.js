const express  = require('express');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const User     = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Rate-limiter: max 10 auth attempts per IP per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts — please try again after 15 minutes.' },
});

// ── Register ──────────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const {
      name, email, password, role,
      studentClass, targetExam, mobile, address,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const user = new User({
      name:       name.trim(),
      email:      email.trim().toLowerCase(),
      role:       role === 'admin' ? 'admin' : 'student',
      class:      studentClass,
      targetExam,
      mobile,
      address,
    });

    // User.register hashes password with PBKDF2-SHA512 and saves the user
    await User.register(user, password);

    // Auto-login after registration
    req.login(user, (err) => {
      if (err) return next(err);
      return res.status(201).json({
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
    });
  } catch (err) {
    if (err.name === 'UserExistsError') {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }
    next(err);
  }
});

// ── Login ─────────────────────────────────────────────────────────
router.post('/login', authLimiter, (req, res, next) => {
  console.log('Login attempt:', req.body.email);
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(400).json({ message: info?.message || 'Invalid email or password.' });
    }

    // Regenerate session ID before storing auth to prevent session-fixation attacks
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({
          user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
      });
    });
  })(req, res, next);
});


router.post('/m/login', authLimiter, (req, res, next) => {
  console.log('Login attempt:', req.body.email);
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(400).json({ message: info?.message || 'Invalid email or password.' });
    }

    // Regenerate session ID before storing auth to prevent session-fixation attacks
    req.session.regenerate((err) => {
      req.login(user, (err) => {
      if (err) return next(err);
  const rawCookie = res.getHeader('set-cookie');
  const cookieValue = (Array.isArray(rawCookie) ? rawCookie[0] : rawCookie)?.split(';')[0] ?? null;
  return res.status(201).json({
    cookie: cookieValue,                                          // ← add this
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});
    });
  })(req, res, next);
});

// ── Logout ────────────────────────────────────────────────────────
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('sid');   // name set in server.js
      res.json({ message: 'Logged out successfully.' });
    });
  });
});

// ── Current user ──────────────────────────────────────────────────
router.get('/me', auth, (req, res) => {
  res.json({
    user: {
      id:    req.user._id,
      name:  req.user.name,
      email: req.user.email,
      role:  req.user.role,
    },
  });
});

router.get('/m/me', auth, (req, res) => {
  res.json(req.user);
});

// ── Student profile update ────────────────────────────────────────
router.put('/student/profile', auth, async (req, res, next) => {
  try {
    const { name, class: studentClass, targetExam, mobile, address } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.name       = name;
    user.class      = studentClass;
    user.targetExam = targetExam;
    user.mobile     = mobile;
    user.address    = address;
    await user.save();
    res.json({ message: 'Profile updated.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
