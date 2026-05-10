import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Config from './models/Config.js'; // Sesuaikan path jika model ada di dalam folder models

const seedConfig = async () => {
  try {
    // 1. Koneksi ke MongoDB
    console.log('Menghubungkan ke database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Berhasil terhubung ke MongoDB.');

    // 2. Bersihkan data konfigurasi yang lama (agar tidak ada duplikat)
    await Config.deleteMany({});
    console.log('Data konfigurasi lama berhasil dihapus.');

    // 3. Siapkan Password Admin Default (misal: "admin123")
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // 4. Siapkan Data Seed
    const initialConfig = {
      bride: {
        name: 'Hana Anisa',
        father: 'Bpk. Ahmad Suharjo',
        mother: 'Ibu Siti Aminah',
        address: 'Jl. Melati No. 12, Bandung',
        instagram: '@hanaanisa'
      },
      groom: {
        name: 'Arya Permana',
        father: 'Bpk. Budi Santoso',
        mother: 'Ibu Rina Wati',
        address: 'Jl. Mawar No. 45, Jakarta',
        instagram: '@aryaprmn'
      },
      otherFamily: [
        { name: 'Keluarga Besar Bpk. Ahmad Suharjo' },
        { name: 'Keluarga Besar Bpk. Budi Santoso' }
      ],
      events: [
        {
          name: 'Akad Nikah',
          date: new Date('2026-06-01T08:00:00Z'),
          time: '08:00',
          location: 'Masjid Raya Al-Akbar'
        },
        {
          name: 'Resepsi',
          date: new Date('2026-06-01T11:00:00Z'),
          time: '11:00',
          location: 'Gedung Serbaguna, Bandung'
        }
      ],
      maps: { iframe: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3957.9490598056354!2d108.37168547017015!3d-7.24663805515434!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6f5cde394cd2cd%3A0x3551973547566093!2sMie%20Baso%20Malvinas!5e0!3m2!1sid!2sid!4v1778140565855!5m2!1sid!2sid',venue: 'Kediaman Mempelai Wanita, RT 02 RW 14, Dusun Bangbayang Kidul', address: 'Desa Bangbayang Cipaku Ciamis'},
      eventDate: new Date('2026-06-01T08:00:00Z'),
      gallery: [
        { imageUrl: 'https://via.placeholder.com/600x400?text=Gallery+1' },
        { imageUrl: 'https://via.placeholder.com/600x400?text=Gallery+2' }
      ],
      polaroidPhoto: [
        { imageUrl: 'https://via.placeholder.com/300x400?text=Polaroid+1' },
        { imageUrl: 'https://via.placeholder.com/300x400?text=Polaroid+2' }
      ],
      bankAccounts: [
        {
          bank: 'BCA',
          account: '1234567890',
          name: 'Arya Permana'
        },
        {
          bank: 'Mandiri',
          account: '0987654321',
          name: 'Hana Anisa'
        }
      ],
      bgmUrl: '/music/default-bgm.mp3',
      dashboardPassword: hashedPassword // Simpan password yang sudah di-hash
    };

    // 5. Simpan ke Database
    await Config.create(initialConfig);
    console.log('✅ Seeding berhasil! Data konfigurasi awal telah ditambahkan.');
    console.log('🔑 Password dashboard default Anda adalah: admin123');

    // 6. Tutup koneksi
    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Gagal melakukan seeding:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

// Jalankan fungsi
seedConfig();