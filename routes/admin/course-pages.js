const express = require('express');
const { auth, adminOnly } = require('../../middleware/auth');

const router = express.Router();

router.get('/admin/courses/create/new', auth, adminOnly, async (req, res) => {
  try {
    res.render('admin/create-course', { title: 'Create New Course' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/admin/courses/:courseId/edit', auth, adminOnly, async (req, res) => {
  try {
    res.render('admin/edit-course', { title: 'Edit Course' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
