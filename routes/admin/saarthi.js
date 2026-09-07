const express = require('express');
const { auth, adminOnly } = require('../../middleware/auth');
const User = require('../../models/User');
const SaarthiBatch = require('../../models/SaarthiBatch');

const router = express.Router();

// Get Admin Saarthi Manager Page
router.get('/admin/saarthi', auth, adminOnly, async (req, res) => {
  try {
    const batches = await SaarthiBatch.find().populate('assignedSmes', 'name email');
    const smes = await User.find({ role: 'sme' });
    const students = await User.find({ role: 'student' });

    res.render('admin/saarthi-manager', { title: 'Manage Saarthi Batches', batches, smes, students, user: req.user });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Create Batch
router.post('/api/admin/saarthi', auth, adminOnly, async (req, res) => {
  try {
    const { title, description, subject, price, validity, assignedSmes } = req.body;
    const newBatch = new SaarthiBatch({
      title, description, subject, price, validity, assignedSmes
    });
    await newBatch.save();
    res.redirect('/admin/saarthi');
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Edit Batch
router.put('/api/admin/saarthi/:batchId', auth, adminOnly, async (req, res) => {
  try {
    const { title, description, subject, price, validity, assignedSmes } = req.body;
    await SaarthiBatch.findByIdAndUpdate(req.params.batchId, {
      title, description, subject, price, validity, assignedSmes
    });
    res.status(200).json({ message: 'Batch updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete Batch
router.delete('/api/admin/saarthi/:batchId', auth, adminOnly, async (req, res) => {
  try {
    await SaarthiBatch.findByIdAndDelete(req.params.batchId);
    res.status(200).json({ message: 'Batch deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Manually Enroll Student
router.post('/api/admin/saarthi/enroll', auth, adminOnly, async (req, res) => {
  try {
    const { studentId, batchId } = req.body;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).send('Student not found');

    if (!student.purchasedSaarthi) student.purchasedSaarthi = [];
    if (!student.purchasedSaarthi.includes(batchId)) {
      student.purchasedSaarthi.push(batchId);
      await student.save();
    }
    res.redirect('/admin/saarthi');
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
