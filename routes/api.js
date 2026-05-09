import express from 'express';
import Config from '../models/Config.js';
import Guest from '../models/Guest.js';
import Photo from '../models/Photo.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';

// 1. Import router photo.js (Pastikan path-nya benar, misal satu folder di /routes)
import photoRoutes from './photo.js'; 
import StoryRoutes from './story.js'
import UploadSupabaseRoutes from './uploadSupabase.js'
import MusicRoutes from './music.js'
import axios from 'axios';
import multer from 'multer';

const router = express.Router();

// 2. Gabungkan semua route dari photo.js ke dalam api.js
// Karena di server.js sudah memakai awalan '/api', maka route di photo.js 
// otomatis menjadi /api/admin/photos/... (Sesuai dengan frontend!)
router.use(photoRoutes);
router.use(StoryRoutes);
router.use(UploadSupabaseRoutes)
router.use(MusicRoutes)


// ==========================================
// ROUTE AUTH & CONFIG (Tetap sama seperti milik Kakak)
// ==========================================
router.post('/user/login', async(req, res) => {
 try {
    const { password } = req.body;
    const config = await Config.findOne();
    if (!config) return res.status(500).json({ message: 'Sistem belum disetup' });

    const validPass = await bcrypt.compare(password, config.dashboardPassword);
    if (!validPass) return res.status(400).json({ message: 'Password salah!' });

    const token = jwt.sign({ role: 'mempelai' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, message: 'Login berhasil!' });
  } catch (error) {
    res.status(500).json({ message: 'Error di server' });
  }
});

router.get('/change-password', async(req, res) => {
  try {
    const { newPassword } = req.body;
    const config = await Config.findOne();
    if(!config) return res.status(404).json({ message: "Konfigurasi belum disetup" });
    
    if(!newPassword || newPassword.length < 6){
        return res.status(400).json({ message: 'Password baru harus berisi minimal 6 karakter' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await Config.updateOne({}, { dashboardPassword: hashedPassword });
    res.json({ message: 'Password berhasil diubah!' });
  } catch(error) {
    res.status(500).json({ message: "Gagal mengganti password", error });
  }
});

router.post('/admin/config', async (req, res) => {
  try {
    const { bride, groom, address, events, otherFamily, eventDate, bankAccounts, dashboardPassword,maps } = req.body;
    const config = await Config.findOne();
    if(!config) return res.status(404).json({ message: "Konfigurasi belum disetup" });
    
    await Config.updateOne({}, { bride, groom, address, eventDate, events, otherFamily, bankAccounts, dashboardPassword,maps });
    res.json({ message: 'Konfigurasi berhasil diubah!' });
  } catch(error) {
    res.status(500).json({ message: "Gagal mengubah konfigurasi", error });
  }
});


router.get('/config', async (req, res) => {
  try {
    const config = await Config.findOne();
    const guests = await Guest.find({
      hasRSVPed: true,
    });
    const photos = await Photo.find();
    const photosData = photos.map(p => { return { url: p.url, role: p.role } })
    if (!config) return res.status(404).json({ message: 'Konfigurasi belum disetup' });
    res.json({config, photos:photosData, guests});
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan server', error });
  }
});

router.get('/guestbook', async (req, res) => {
  try {
    // Cari tamu yang field message-nya ada dan tidak kosong
    const guests = await Guest.find({ 
        message: { $exists: true, $ne: '' } 
      })
      .sort({ createdAt: -1 }) // Urutkan dari yang paling baru
      .select('guestName message createdAt'); // HANYA ambil 3 data ini untuk keamanan & kecepatan

    res.json(guests);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil buku tamu", error });
  }
});
// ==========================================
// ROUTE GUESTS (Tetap sama seperti milik Kakak)
// ==========================================
router.get('/guest/:slug', async (req, res) => {
  try {
    const guest = await Guest.findOne({ slug: req.params.slug });
    if (!guest) return res.status(404).json({ message: 'Tamu tidak ditemukan' });
    res.json(guest);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan server', error });
  }
});


router.get('/admin/guests', async(req, res) => {
  try {
    const guests = await Guest.find();
    const totalGuests = await Guest.countDocuments();
    if(!guests) return res.status(404).json({ message: "Guest tidak ditemukan" });
    res.json({ guests, totalGuests });
  } catch(error) {
    res.status(500).json({ message: "Terjadi kesalahan server", error });
  }
});

router.post('/admin/guests', async(req,res)=>{
  try{
    // Tangkap whatsappNumber dari frontend
    const { guestName, whatsappNumber } = req.body; 
    let slug = guestName.toLowerCase().replace(/\s/g, '-');
    let count = 0;
    while(await Guest.findOne({slug})){
      count++;
      slug = slug +"-"+ count;
    }
    
    // Simpan whatsappNumber juga
    const guest = new Guest({ slug, guestName, whatsappNumber }); 
    await guest.save();
    
    res.json({message:"Guest berhasil ditambahkan!", guest});
  }catch(error){
    res.status(500).json({message:"Terjadi kesalahan server",error});
  }
});

router.post('/admin/guests/:id', async(req, res) => {
  try {
    const { slug, guestName } = req.body;
    const guest = await Guest.findByIdAndUpdate(req.params.id, { slug, guestName }, { new: true });
    if(!guest) return res.status(404).json({ message: "Guest tidak ditemukan" });
    res.json({ message: "Guest berhasil diupdate!", guest });
  } catch(error) {
    res.status(500).json({ message: "Terjadi kesalahan server", error });
  }
});

router.delete('/admin/guests/:id', async(req, res) => {
  try {
    const guest = await Guest.findByIdAndDelete(req.params.id);
    if(!guest) return res.status(404).json({ message: "Guest tidak ditemukan" });
    res.json({ message: "Guest berhasil dihapus!", guest });
  } catch(error) {
    res.status(500).json({ message: "Terjadi kesalahan server", error });
  }
});

router.post('/rsvp/:slug', async (req, res) => {
  try {
    const { isAttending, headcount, message } = req.body;
 const guest = await Guest.findOneAndUpdate(
      { slug: req.params.slug },
      { 
        hasRSVPed: true, // <--- Set menjadi true saat mereka submit!
        isAttending, 
        headcount: isAttending ? headcount : 0, 
        message 
      },
      { new: true } 
    );
    
    if (!guest) return res.status(404).json({ message: 'Tamu tidak ditemukan' });
    res.json({ message: 'RSVP berhasil disimpan!', guest });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menyimpan RSVP', error });
  }
});


export default router;