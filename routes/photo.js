import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import Photo from '../models/Photo.js';
const router = express.Router();

// ==========================================
// SETUP MULTER (Penyimpanan Lokal Sementara)
// ==========================================
// Pastikan folder public/uploads ada, jika tidak, buat otomatis
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Nama file unik: Waktu saat ini + Angka Random + Ekstensi
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => {
  // Izinkan tipe MIME untuk gambar dan video
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung! Hanya gambar dan video yang diperbolehkan.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // Pastikan limit size cukup besar untuk video (contoh: 50MB)
});


// ==========================================
// 1. GET ALL PHOTOS (Untuk memuat galeri awal)
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
// 2. POST UPLOAD FILES (Dari Tab Upload File)
// ==========================================
// 'photos' harus sama dengan nama di formData.append('photos', file)
router.post('/admin/photos/upload', upload.array('photos', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah' });
    }

    // Siapkan array data untuk disimpan ke MongoDB
    const photoData = req.files.map(file => ({
      url: `uploads/${file.filename}`, // URL lokal untuk diakses frontend
      role: 'gallery',
      source: 'file'
    }));

    const savedPhotos = await Photo.insertMany(photoData);
    
    // Kembalikan { photos: [...] } sesuai ekspektasi frontend Kakak
    res.status(201).json({ message: 'Upload berhasil', photos: savedPhotos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal upload file', error });
  }
});


// ==========================================
// 3. POST ADD URL (Dari Tab Via URL)
// ==========================================
// Helper konversi Google Drive URL
const convertGoogleDriveUrl = (url) => {
  // Format 1: /file/d/ID/view
  const match1 = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
  if (match1) {
    return `https://drive.usercontent.google.com/download?id=${match1[1]}&export=view&authuser=0`;
  }

  // Format 2: /uc?export=view&id=ID (format lama)
  const match2 = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  if (match2) {
    return `https://drive.usercontent.google.com/download?id=${match2[1]}&export=view&authuser=0`;
  }

  // Sudah format usercontent, langsung pakai
  if (url.includes('drive.usercontent.google.com')) {
    return url;
  }

  return url;
};

router.post('/admin/photos', async (req, res) => {
  try {
    const { url, role } = req.body;

    if (!url) return res.status(400).json({ message: 'URL wajib diisi' });

    // ← Konversi otomatis jika URL dari Google Drive
    const finalUrl = convertGoogleDriveUrl(url.trim());
   
    const newPhoto = new Photo({
      url: finalUrl,  // ← pakai finalUrl
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
// 4. PATCH UPDATE ROLE (Mengubah dari Galeri ke Mempelai/Cover)
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
// 5. DELETE PHOTO (Hapus Data & File Fisiknya)
// ==========================================
router.delete('/admin/photos/:id', async (req, res) => {
  try {
    // Cari foto dulu untuk mengetahui path URL-nya
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Foto tidak ditemukan' });

    // Hapus dari MongoDB
    await Photo.findByIdAndDelete(req.params.id);

    // Jika foto tersebut dari file lokal (bukan URL online), hapus file fisiknya!
    if (photo.source === 'file' && photo.url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', photo.url);
      
      // Cek apakah file benar-benar ada di server lalu hapus
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Foto berhasil dihapus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menghapus foto', error });
  }
});

router.post('/admin/photos/from-ig', async (req, res) => {
  try {
    const { url } = req.body;

    // Download gambar dari URL
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      headers: {
        // Pura-pura jadi browser biasa
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.instagram.com/',
      }
    });

    const filename = `ig-${Date.now()}.jpg`;
    const filepath = uploadDir + filename;
    fs.writeFileSync(filepath, response.data);

    const newPhoto = new Photo({
      url: `/uploads/${filename}`,
      role: 'gallery',
      source: 'file',
    });
    await newPhoto.save();

    res.json({ photo: newPhoto });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil gambar dari URL', error: error.message });
  }
});

export default router;