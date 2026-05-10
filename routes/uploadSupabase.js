import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Panggil konfigurasi .env

const router = express.Router();

// 1. Inisialisasi Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 2. Setup Multer untuk menggunakan Memory (RAM) bukan Disk lokal
const upload = multer({ storage: multer.memoryStorage() });

// 3. Route Upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah' });
    }

    // Bersihkan nama file dari spasi dan tambahkan timestamp agar unik
    const cleanFileName = req.file.originalname.replace(/\s+/g, '-');
    const fileName = `${Date.now()}-${cleanFileName}`;
    const filePath = `uploads/${fileName}`; // File akan masuk ke dalam folder 'uploads' di dalam bucket

    // 4. Proses upload buffer ke Supabase Storage
    const { data, error } = await supabase.storage
      .from('undangan-assets') // Sesuai dengan nama bucket yang Kakak buat di Supabase
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // 5. Dapatkan URL Publik dari file tersebut
    const { data: publicUrlData } = supabase.storage
      .from('undangan-assets')
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData.publicUrl;

    // TODO: Simpan `fileUrl` ini ke database MongoDB Kakak
    // contoh (jika menggunakan mongoose): await ConfigModel.updateOne({}, { bgmUrl: fileUrl });

    res.status(200).json({
      message: 'Upload ke Supabase berhasil!',
      url: fileUrl // URL ini yang dilempar kembali ke Frontend/React
    });

  } catch (error) {
    console.error("Error Upload Supabase:", error);
    res.status(500).json({ message: 'Upload gagal', error: error.message });
  }
});

// Export menggunakan ES Module standar
export default router;