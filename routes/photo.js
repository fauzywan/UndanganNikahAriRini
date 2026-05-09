import express from 'express';
import multer from 'multer';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Photo from '../models/Photo.js';

dotenv.config();
const router = express.Router();

// ==========================================
// SETUP SUPABASE & MULTER
// ==========================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Sesuaikan dengan nama bucket Kakak (yang pakai titik)
const BUCKET_NAME = 'undangan-assets.'; 

const upload = multer({ 
  storage: multer.memoryStorage(), // Gunakan RAM
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung! Hanya gambar dan video yang diperbolehkan.'), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // Limit 50MB
});

// ==========================================
// 1. GET ALL PHOTOS
// ==========================================
router.get('/admin/photos', async (req, res) => {
  try {
    const photos = await Photo.find().sort({ createdAt: -1 });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data foto', error });
  }
});

// ==========================================
// 2. POST UPLOAD FILES (Multiple Upload ke Supabase)
// ==========================================
router.post('/admin/photos/upload', upload.array('photos', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah' });
    }

    // Gunakan Promise.all agar upload berjalan paralel & cepat
    const uploadedPhotosData = await Promise.all(req.files.map(async (file) => {
      // Bersihkan nama file
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1000)}-${safeName}`;
      const filePath = `photos/${fileName}`; // Folder 'photos' di dalam bucket

      // Upload ke Supabase
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Ambil Public URL
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      // Kembalikan format object untuk MongoDB
      return {
        url: publicUrlData.publicUrl,
        role: 'gallery',
        source: 'file'
      };
    }));

    // Simpan semua URL ke MongoDB
    const savedPhotos = await Photo.insertMany(uploadedPhotosData);
    
    res.status(201).json({ message: 'Upload berhasil', photos: savedPhotos });
  } catch (error) {
    console.error("Gagal upload foto:", error);
    res.status(500).json({ message: 'Gagal upload file ke server', error: error.message });
  }
});

// ==========================================
// 3. POST ADD URL (Dari Tab Via URL)
// ==========================================
const convertGoogleDriveUrl = (url) => {
  const match1 = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
  if (match1) return `https://drive.usercontent.google.com/download?id=${match1[1]}&export=view&authuser=0`;

  const match2 = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  if (match2) return `https://drive.usercontent.google.com/download?id=${match2[1]}&export=view&authuser=0`;

  if (url.includes('drive.usercontent.google.com')) return url;
  return url;
};

router.post('/admin/photos', async (req, res) => {
  try {
    const { url, role } = req.body;
    if (!url) return res.status(400).json({ message: 'URL wajib diisi' });

    const finalUrl = convertGoogleDriveUrl(url.trim());
    console.log(finalUrl)
    const newPhoto = new Photo({
      url: finalUrl,
      role: role || 'gallery',
      source: 'url'
    });

    await newPhoto.save();
    res.status(201).json({ message: 'URL ditambahkan', photo: newPhoto });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menyimpan URL', error });
  }
});

// ==========================================
// 4. PATCH UPDATE ROLE
// ==========================================
router.patch('/admin/photos/:id', async (req, res) => {
  try {
    const { role } = req.body;
    const photo = await Photo.findByIdAndUpdate(
      req.params.id, 
      { role }, 
      { new: true }
    );

    if (!photo) return res.status(404).json({ message: 'Foto tidak ditemukan' });
    
    res.json({ message: 'Role berhasil diperbarui', photo });
  } catch (error) {
    res.status(500).json({ message: 'Gagal update role', error });
  }
});

// ==========================================
// 5. DELETE PHOTO (Hapus dari MongoDB dan Supabase)
// ==========================================
router.delete('/admin/photos/:id', async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Foto tidak ditemukan' });

    // Hapus dari MongoDB
    await Photo.findByIdAndDelete(req.params.id);

    // Jika foto berasal dari Supabase, hapus filenya
    if (photo.url && photo.url.includes('supabase.co')) {
      const parts = photo.url.split(`/${BUCKET_NAME}/`);
      if (parts.length > 1) {
        const filePath = decodeURIComponent(parts[1]);
        
        const { error: removeError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([filePath]);

        if (removeError) console.error("Gagal hapus file dari Supabase:", removeError.message);
      }
    }

    res.json({ message: 'Foto berhasil dihapus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menghapus foto', error });
  }
});

// ==========================================
// 6. FETCH & UPLOAD DARI IG
// ==========================================
router.post('/admin/photos/from-ig', async (req, res) => {
  try {
    const { url } = req.body;

    // Ambil gambar sebagai buffer
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.instagram.com/',
      }
    });

    const fileName = `ig-${Date.now()}.jpg`;
    const filePath = `photos/${fileName}`;

    // Lempar buffer langsung ke Supabase (tanpa simpan di fs lokal)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, response.data, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Dapatkan URL Publik
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // Simpan ke MongoDB
    const newPhoto = new Photo({
      url: publicUrlData.publicUrl,
      role: 'gallery',
      source: 'file',
    });
    
    await newPhoto.save();

    res.json({ photo: newPhoto });
  } catch (error) {
    console.error("Gagal ambil dari IG:", error);
    res.status(500).json({ message: 'Gagal mengambil gambar dari URL', error: error.message });
  }
});

export default router;