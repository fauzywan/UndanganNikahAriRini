import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Config from '../models/Config.js'; 

dotenv.config();
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } 
});

router.post('/config/music', upload.single('musicFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang dipilih' });
    }

    // 1. Ambil data lama untuk referensi penghapusan
    const oldConfig = await Config.findOne();
    const oldBgmUrl = oldConfig?.bgmUrl;

    // 2. Siapkan file baru
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = `music/${fileName}`;

    // 3. Upload file baru ke Supabase
    // PERBAIKAN: Pastikan nama bucket 'undangan-assets.' (TANPA TITIK)
    const { error: uploadError } = await supabase.storage
      .from('undangan-assets.') 
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 4. Dapatkan Public URL baru
    const { data: publicUrlData } = supabase.storage
      .from('undangan-assets.')
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData.publicUrl;

    // 5. Update Database MongoDB
    await Config.updateOne(
      {}, 
      { $set: { "bgmUrl": fileUrl } },
      { upsert: true }
    );
    // 6. LOGIKA PENGHAPUSAN FILE LAMA (PERBAIKAN TOTAL)
    if (oldBgmUrl && oldBgmUrl.includes('supabase.co')) {
      try {
        // Ekstrak path setelah nama bucket
        // Contoh URL: https://xyz.supabase.co/storage/v1/object/public/undangan-assets./music/file.mp3
        const parts = oldBgmUrl.split('/undangan-assets./');
        if (parts.length > 1) {
          // decodeURIComponent penting jika nama file mengandung karakter khusus agar dibaca benar oleh Supabase
          const oldFilePath = decodeURIComponent(parts[1]);
          
          console.log("Mencoba menghapus file lama:", oldFilePath);
          
          const { error: removeError } = await supabase.storage
            .from('undangan-assets.')
            .remove([oldFilePath]);

          if (removeError) {
            console.error("Gagal hapus file di Supabase:", removeError.message);
          } else {
            console.log("File lama berhasil dihapus dari Supabase");
          }
        }
      } catch (err) {
        console.error("Error saat memproses penghapusan file lama:", err);
      }
    }
    
    res.status(200).json({
      message: 'Musik berhasil diperbarui dan file lama dibersihkan!',
      url: fileUrl
    });

  } catch (error) {
    console.error("Gagal proses musik:", error);
    res.status(500).json({ message: 'Gagal mengunggah musik', error: error.message });
  }
});

export default router;