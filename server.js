import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { verifySlip } from './api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 1337;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp|bmp|tiff/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('เฉพาะไฟล์รูปภาพเท่านั้น!'));
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.render('index', { title: 'ตรวจสอบสลิปโอนเงิน' });
});

// API สำหรับตรวจสอบสลิป
app.post('/verify', upload.single('slipImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาอัพโหลดไฟล์รูปภาพ' });
    }

    const imagePath = req.file.path;
    const result = await verifySlip(imagePath);
    
    if (!result) {
      // ลบไฟล์ภาพเมื่อตรวจสอบไม่สำเร็จ
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      return res.status(500).json({ error: 'ไม่สามารถตรวจสอบสลิปได้' });
    }
    
    // เพิ่มข้อมูลไฟล์
    result.filename = req.file.filename;
    result.originalname = req.file.originalname;
    
    // ส่งผลลัพธ์กลับไป
    res.json(result);
    
    // ลบไฟล์ภาพหลังจากตรวจสอบเสร็จ
    setTimeout(() => {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`ลบไฟล์ ${req.file.filename} เรียบร้อยแล้ว`);
      }
    }, 1000); // รอ 1 วินาทีก่อนลบไฟล์เพื่อให้แน่ใจว่าการส่งข้อมูลเสร็จสมบูรณ์
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
    
    // ลบไฟล์ภาพเมื่อเกิดข้อผิดพลาด
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป' });
  }
});

// สร้างโฟลเดอร์ที่จำเป็น
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirExists(path.join(__dirname, 'public'));
ensureDirExists(path.join(__dirname, 'views'));
ensureDirExists(path.join(__dirname, 'uploads'));

// เริ่มต้นเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`เซิร์ฟเวอร์ทำงานที่ http://localhost:${port}`);
}); 