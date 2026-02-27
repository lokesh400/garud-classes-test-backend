const express = require('express');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const { uploadToSubjectCloud, deleteFromSubjectCloud } = require('../config/cloudinary');
const upload = require('../middleware/upload');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get questions with filters
router.get('/', auth, async (req, res) => {
  try {
    const { subject, chapter, topic, type } = req.query;
    const filter = {};
    if (subject) filter.subject = subject;
    if (chapter) filter.chapter = chapter;
    if (topic) filter.topic = topic;
    if (type) filter.type = type;

    const questions = await Question.find(filter)
      .populate('subject', 'name')
      .populate({
        path: 'chapter',
        select: 'name',
      })
      .populate('topic', 'name')
      .sort({ createdAt: -1 });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single question
router.get('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('subject', 'name')
      .populate('chapter', 'name')
      .populate('topic', 'name');

    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload question (admin only)
// Uses memory storage + manual Cloudinary upload to the correct subject account
router.post('/', auth, adminOnly, upload.single('image'), async (req, res) => {
  let uploadResult = null;
  let subjectName = null;

  try {
    const { type, correctOption, correctNumericalAnswer, subject, chapter, topic } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Question image is required' });
    }

    // Look up subject name for Cloudinary account selection
    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      return res.status(400).json({ message: 'Subject not found' });
    }
    subjectName = subjectDoc.name;

    // Upload image to the subject-specific Cloudinary account
    uploadResult = await uploadToSubjectCloud(req.file.buffer, subjectName);

    const questionData = {
      imageUrl: uploadResult.secure_url,
      imagePublicId: uploadResult.public_id,
      type,
      subject,
      chapter,
      topic,
    };

    if (type === 'mcq') {
      questionData.correctOption = correctOption;
    } else if (type === 'numerical') {
      questionData.correctNumericalAnswer = parseFloat(correctNumericalAnswer);
    }

    const question = new Question(questionData);
    await question.save();

    const populated = await question.populate([
      { path: 'subject', select: 'name' },
      { path: 'chapter', select: 'name' },
      { path: 'topic', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    // Clean up uploaded image if DB save fails
    if (uploadResult && uploadResult.public_id && subjectName) {
      try {
        await deleteFromSubjectCloud(uploadResult.public_id, subjectName);
      } catch (cleanupErr) {
        console.error('Cloudinary cleanup failed:', cleanupErr.message);
      }
    }
    res.status(500).json({ message: error.message });
  }
});

// Delete question (admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate('subject', 'name');
    if (!question) return res.status(404).json({ message: 'Question not found' });

    // Delete from the correct Cloudinary account
    if (question.imagePublicId && question.subject?.name) {
      await deleteFromSubjectCloud(question.imagePublicId, question.subject.name);
    }

    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
