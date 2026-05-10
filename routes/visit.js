import express from 'express';
import Visit from '../models/Visit.js';

const router = express.Router();

// A. Endpoint untuk MENCATAT kunjungan (Dipanggil oleh tamu)
router.post('/track', async (req, res) => {
 try {
    const { visitorId, userAgent } = req.body;
    if (!visitorId) return res.status(400).json({ message: 'Visitor ID diperlukan' });
    
    const newVisit = new Visit({ visitorId, device: userAgent });
    await newVisit.save();
    res.status(200).json({ message: 'Kunjungan tercatat' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mencatat kunjungan', error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    // 1. Hitung Angka Global
    const totalViews = await Visit.countDocuments();
    const uniqueVisitors = await Visit.distinct('visitorId');
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const viewsToday = await Visit.countDocuments({ createdAt: { $gte: startOfToday } });

    // 2. Data untuk Grafik (Traffic 7 Hari Terakhir)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Agregasi MongoDB untuk mengelompokkan pengunjung per hari
    const chartDataRaw = await Visit.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Jakarta" } },
          views: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$visitorId" } // Kumpulkan ID unik
        }
      },
      {
        $project: {
          date: "$_id",
          views: 1,
          unique: { $size: "$uniqueVisitors" }, // Hitung panjang array ID unik
          _id: 0
        }
      },
      { $sort: { date: 1 } } // Urutkan dari tanggal paling lama ke terbaru
    ]);

    // Format ulang tanggal agar lebih cantik dibaca di grafik (misal: "12 Mei")
    const chartData = chartDataRaw.map(item => {
      const dateObj = new Date(item.date);
      return {
        ...item,
        displayDate: dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      };
    });

    res.status(200).json({
      totalViews,
      uniqueVisitors: uniqueVisitors.length,
      viewsToday,
      chartData // Kirim data grafik ke frontend
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil statistik', error: error.message });
  }
});
export default router;