import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gpc_service';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const gpcSchema = new mongoose.Schema({
  category: String,
  code: String,
  codeDescription: String,
  codeDefinition: String,
});

const GPC = mongoose.model('GPC', gpcSchema);

export { db, GPC };