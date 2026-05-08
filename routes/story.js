// routes/story.js (atau tambahkan di file router yang sudah ada)
import express from 'express';
const router = express.Router();
import Story from '../models/Story.js';

// GET: Ambil semua cerita (diurutkan berdasarkan 'order' dari yang terkecil)
router.get('/admin/stories', async (req, res) => {
  try {
    const stories = await Story.find().sort({ order: 1 });
    res.status(200).json(stories);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat cerita', error });
  }
});

// POST: Tambah cerita baru
router.post('/admin/stories', async (req, res) => {
  try {
    const newStory = new Story(req.body);
    const savedStory = await newStory.save();
    res.status(201).json({ message: 'Cerita berhasil ditambahkan', story: savedStory });
  } catch (error) {
    res.status(400).json({ message: 'Gagal menambahkan cerita', error });
  }
});

// PUT: Update cerita berdasarkan ID
router.put('/admin/stories/:id', async (req, res) => {
  try {
    const updatedStory = await Story.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!updatedStory) return res.status(404).json({ message: 'Cerita tidak ditemukan' });
    res.status(200).json({ message: 'Cerita berhasil diperbarui', story: updatedStory });
  } catch (error) {
    res.status(400).json({ message: 'Gagal memperbarui cerita', error });
  }
});

// DELETE: Hapus cerita berdasarkan ID
router.delete('/admin/stories/:id', async (req, res) => {
  try {
    const deletedStory = await Story.findByIdAndDelete(req.params.id);
    if (!deletedStory) return res.status(404).json({ message: 'Cerita tidak ditemukan' });
    res.status(200).json({ message: 'Cerita berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus cerita', error });
  }
});

export default router;