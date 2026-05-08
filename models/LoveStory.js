// models/Story.js
const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Judul cerita harus diisi'],
    trim: true
  },
  date: {
    type: String, // Menggunakan String agar fleksibel (misal: "Januari 2020" atau "15 Okt 2021")
    required: [true, 'Tanggal/Waktu harus diisi']
  },
  description: {
    type: String,
    required: [true, 'Deskripsi cerita harus diisi']
  },
  image: {
    type: String, // URL gambar (bisa diambil dari galeri yang sudah kita buat sebelumnya)
    default: ''
  },
  order: {
    type: Number, // Untuk mengurutkan timeline (misal: 1 untuk pertemuan pertama)
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Story', storySchema);