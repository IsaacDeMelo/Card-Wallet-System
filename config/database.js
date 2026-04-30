const mongoose = require('mongoose');

async function connectDatabase() {
  const mongoUri = process.env.MongoUri || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MongoUri (ou MONGO_URI) nao encontrado no .env.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
}

module.exports = connectDatabase;
