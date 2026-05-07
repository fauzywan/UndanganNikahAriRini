// models/Photo.js
import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  role: { type: String, default: 'gallery' },
  source: { type: String, enum: ['file', 'url'], default: 'file' }, // Menandai asal foto
  createdAt: { type: Date, default: Date.now }
});

// Virtual agar _id dari MongoDB bisa diakses sebagai id (seperti di frontend Kakak)
photoSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
photoSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Photo', photoSchema);