import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema({
  visitorId: { 
    type: String, 
    required: true 
  },
  device: {
    type: String,
    default: 'Unknown'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('Visit', visitSchema);