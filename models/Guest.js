import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  guestName: { type: String, required: true },
  
  // Tambahkan baris ini untuk penanda pasti!
  hasRSVPed: { type: Boolean, default: false }, 
  whatsappNumber: { type: String, default: '' },
  isAttending: { type: Boolean, default: false },
  headcount: { type: Number, default: 0 },
  message: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Guest', guestSchema);