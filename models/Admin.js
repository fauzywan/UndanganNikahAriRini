import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true } // Akan disimpan dalam bentuk acak (hash)
});

export default mongoose.model('Admin', adminSchema);