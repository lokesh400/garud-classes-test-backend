const express = require('express');

const router = express.Router();

router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', (req, res) => res.render('login', { title: 'Sign In' }));
router.get('/register', (req, res) => res.render('register', { title: 'Register' }));

module.exports = router;
