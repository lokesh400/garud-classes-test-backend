/**
 * config/passport.js
 * Configures passport-local strategy via passport-local-mongoose.
 * Must be required AFTER the User model is loaded.
 */
const passport = require('passport');
const User     = require('../models/User');

// passport-local-mongoose attaches createStrategy, serializeUser, deserializeUser
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

module.exports = passport;
