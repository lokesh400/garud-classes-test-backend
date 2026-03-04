const express = require('express');
const router = express.Router();

// ── Root ──────────────────────────────────────────────────────────
router.get('/', (req, res) => res.redirect('/login'));

// ── Auth ──────────────────────────────────────────────────────────
router.get('/login', (req, res) => res.render('login', { title: 'Sign In' }));
router.get('/register', (req, res) => res.render('register', { title: 'Register' }));

// ── Admin ─────────────────────────────────────────────────────────
router.get('/admin/dashboard',
    (req, res) => res.render('admin/dashboard', { title: 'Admin Dashboard' }));

router.get('/admin/question-bank',
    (req, res) => res.render('admin/question-bank', { title: 'Question Bank' }));

router.get('/admin/upload',
    (req, res) => res.render('admin/question-upload', { title: 'Upload Questions' }));

router.get('/admin/tests',
    (req, res) => res.render('admin/test-list', { title: 'Tests' }));

router.get('/admin/tests/:testId',
    (req, res) => res.render('admin/test-creator', { title: 'Test Creator' }));

router.get('/admin/jee-advanced-tests/:testId',
    (req, res) => res.render('admin/jee-advanced-creator', { title: 'JEE Advanced Creator' }));

router.get('/admin/tests/:testId/results',
    (req, res) => res.render('admin/test-results', { title: 'Test Results' }));

router.get('/admin/test-series',
    (req, res) => res.render('admin/test-series-list', { title: 'Test Series' }));

router.get('/admin/test-series/:seriesId/enrolled',
    (req, res) => res.render('admin/test-series-enrolled', { title: 'Enrolled Users' }));

router.get('/admin/test-series/:seriesId',
    (req, res) => res.render('admin/test-series-manager', { title: 'Manage Series' }));

router.get('/admin/reports',
    (req, res) => res.render('admin/reports', { title: 'Question Reports' }));

// ── Student ───────────────────────────────────────────────────────
router.get('/student/dashboard',
    (req, res) => res.render('student/dashboard', { title: 'Dashboard' }));

router.get('/student/test-series',
    (req, res) => res.render('student/test-series-list', { title: 'Test Series' }));

// Batch-gated test: /student/test/:batchId/:testId  (must come before the simpler pattern)
router.get('/student/test/:batchId/:testId',
    (req, res) => res.render('student/test-attempt', { title: 'Test' }));

router.get('/student/test/:testId',
    (req, res) => res.render('student/test-attempt', { title: 'Test' }));

// JEE Advanced test attempt routes
router.get('/student/jee-test/:batchId/:testId',
    (req, res) => res.render('student/jee-advanced-attempt', { title: 'JEE Advanced Test' }));

router.get('/student/jee-test/:testId',
    (req, res) => res.render('student/jee-advanced-attempt', { title: 'JEE Advanced Test' }));

router.get('/student/test-series/:seriesId',
    (req, res) => res.render('student/test-series-view', { title: 'Series Detail' }));

router.get('/student/results/:testId',
    (req, res) => res.render('student/results', { title: 'Results' }));

router.get('/student/purchase-series',
    (req, res) => res.render('student/purchase-series', { title: 'Purchase Series' }));

router.get('/student/purchases',
    (req, res) => res.render('student/purchase-history', { title: 'My Purchases' }));

router.get('/student/study',
    (req, res) => res.render('student/study', { title: 'Study' }));

router.get('/student/profile',
    (req, res) => res.render('student/dashboard', { title: 'Profile' }));

module.exports = router;
