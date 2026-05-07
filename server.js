import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path'; // <--- INI WAJIB DITAMBAHKAN
import apiRoutes from './routes/api.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Koneksi Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Terkoneksi ke MongoDB Atlas'))
  .catch((err) => console.error('Gagal koneksi:', err));

app.use('/api', apiRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));