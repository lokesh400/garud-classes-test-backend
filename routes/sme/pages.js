const express = require('express');
const { auth } = require('../../middleware/auth');
const SaarthiBatch = require('../../models/SaarthiBatch');

const router = express.Router();

const User = require('../../models/User');

// 1. SME Dashboard
router.get('/dashboard', auth, async (req, res) => {
  if (req.user.role !== 'sme' && req.user.role !== 'admin') {
    return res.redirect('/');
  }

  try {
    let batches = [];
    if (req.user.role === 'admin') {
      batches = await SaarthiBatch.find().sort({ createdAt: -1 });
    } else {
      batches = await SaarthiBatch.find({ assignedSmes: req.user._id }).sort({ createdAt: -1 });
    }

    const batchIds = batches.map(b => b._id.toString());
    const students = await User.find({ role: 'student', purchasedSaarthi: { $in: batchIds } }, { name: 1, email: 1, purchasedSaarthi: 1 }).lean();

    const studentList = [];
    students.forEach(student => {
      const overlappingBatches = student.purchasedSaarthi.filter(id => batchIds.includes(id));
      overlappingBatches.forEach(batchId => {
        const batchInfo = batches.find(b => b._id.toString() === batchId);
        if (batchInfo) {
          studentList.push({
            studentId: student._id.toString(),
            studentName: student.name,
            batchId: batchInfo._id.toString(),
            batchTitle: batchInfo.title,
            isMeetActive: batchInfo.isMeetActive
          });
        }
      });
    });
    
    res.render('sme/dashboard', { title: 'SME Dashboard', batches, studentList, user: req.user });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// 2. SME Saarthi Chat
router.get('/saarthi/:batchId', auth, async (req, res) => {
  if (req.user.role !== 'sme' && req.user.role !== 'admin') {
    return res.redirect('/');
  }

  try {
    const batch = await SaarthiBatch.findById(req.params.batchId);
    if (!batch) {
      return res.status(404).send('Batch not found');
    }

    if (req.user.role === 'sme' && !batch.assignedSmes.includes(req.user._id)) {
      return res.status(403).send('Not authorized to access this batch');
    }

    res.render('sme/chat', { title: `Doubt Saarthi - ${batch.title}`, batch, user: req.user });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// 3. SME Meet
router.get('/saarthi/:batchId/meet', auth, async (req, res) => {
  if (req.user.role !== 'sme' && req.user.role !== 'admin') {
    return res.redirect('/');
  }

  try {
    const batch = await SaarthiBatch.findById(req.params.batchId);
    if (!batch || !batch.isMeetActive) return res.status(404).send('No active meet right now.');
    
    // We can reuse the student template since it dynamically routes back based on role
    res.render('student/saarthi-meet', { title: 'Live Meet', batch, user: req.user });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
