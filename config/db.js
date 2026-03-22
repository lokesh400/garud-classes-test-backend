const mongoose = require('mongoose');
const {
  BattlegroundQuiz,
  BattlegroundSubmission,
  BattlegroundStreak,
} = require('../models/Battleground');

async function syncBattlegroundIndexes() {
  const models = [
    ['BattlegroundQuiz', BattlegroundQuiz],
    ['BattlegroundSubmission', BattlegroundSubmission],
    ['BattlegroundStreak', BattlegroundStreak],
  ];

  for (const [name, model] of models) {
    const dropped = await model.syncIndexes();
    if (Array.isArray(dropped) && dropped.length) {
      console.log(`[Mongo] ${name}: dropped outdated indexes -> ${dropped.join(', ')}`);
    }
  }
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    await syncBattlegroundIndexes();
    console.log('[Mongo] Battleground indexes synced');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
