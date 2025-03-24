import pkg from 'tesseract.js';
const { recognize } = pkg;
import chalk from 'chalk';
import Table from 'cli-table3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cache = new Map();

async function preprocessImage(imagePath) {
  const timestamp = Date.now();
  const outputPath = path.join(__dirname, `preprocessed-slip-${timestamp}.jpg`);

  if (imagePath === outputPath) {
    throw new Error('Input และ Output ไฟล์ต้องไม่ซ้ำกัน');
  }

  await sharp(imagePath)
    .grayscale()
    .normalize()
    .modulate({ brightness: 1.1 })
    .sharpen() 
    .threshold(128) 
    .toFile(outputPath);
  return outputPath;
}

async function detectQRCode(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stats = await sharp(imagePath).stats();
    
    const complexity = stats.channels.reduce((sum, channel) => sum + channel.entropy, 0) / stats.channels.length;
    
    const blackWhiteRatio = stats.channels[0].mean / 255;
    
    const aspectRatio = metadata.width / metadata.height;
    
    const hasQR = complexity > 7.0 && blackWhiteRatio < 0.6 && aspectRatio > 0.8 && aspectRatio < 1.2;
    
    console.log(chalk.gray(`ความซับซ้อนของภาพ: ${complexity.toFixed(2)}, สัดส่วนขาว-ดำ: ${blackWhiteRatio.toFixed(2)}, อัตราส่วนภาพ: ${aspectRatio.toFixed(2)}`));
    
    if (hasQR) {
      console.log(chalk.green('พบลักษณะที่อาจเป็น QR Code ในภาพ'));
      return { found: true, data: null };
    } else {
      console.log(chalk.yellow('ไม่พบลักษณะที่อาจเป็น QR Code ในภาพ'));
      return { found: false, data: null };
    }
  } catch (error) {
    console.log(chalk.yellow(`ไม่สามารถตรวจสอบ QR Code: ${error.message}`));
    return { found: false, data: null };
  }
}

async function extractImageMetadata(imagePath) {
  try {
    // อ่านข้อมูลไฟล์
    const stats = fs.statSync(imagePath);
    const fileSize = stats.size;
    const creationTime = stats.birthtime;
    const modificationTime = stats.mtime;
    
    // อ่าน metadata ของรูปภาพด้วย sharp
    const metadata = await sharp(imagePath).metadata();
    
    // คำนวณขนาดไฟล์ในรูปแบบที่อ่านง่าย
    const fileSizeFormatted = formatFileSize(fileSize);
    
    // ตรวจสอบว่ามีการแก้ไขภาพหรือไม่
    const imageStats = await sharp(imagePath).stats();
    const isEdited = checkIfImageEdited(imageStats);
    
    // ตรวจสอบความน่าเชื่อถือของภาพ
    const trustScore = calculateImageTrustScore(metadata, stats, isEdited);
    
    return {
      fileSize: fileSizeFormatted,
      fileSizeBytes: fileSize,
      dimensions: `${metadata.width} x ${metadata.height} พิกเซล`,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      hasProfile: metadata.hasProfile,
      creationTime: creationTime.toLocaleString('th-TH'),
      modificationTime: modificationTime.toLocaleString('th-TH'),
      exif: metadata.exif ? true : false,
      isEdited: isEdited,
      trustScore: trustScore
    };
  } catch (error) {
    console.error(chalk.red(`ไม่สามารถอ่าน metadata ของรูปภาพ: ${error.message}`));
    return null;
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' bytes';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}

function checkIfImageEdited(imageStats) {
  // ตรวจสอบความผิดปกติในสถิติของภาพที่อาจบ่งชี้ว่ามีการแก้ไข
  // เช่น การกระจายตัวของสีที่ผิดปกติ หรือความเข้มของสีที่ไม่เป็นธรรมชาติ
  
  // ตรวจสอบการกระจายตัวของสี
  const channels = imageStats.channels;
  let unnaturalDistribution = false;
  
  // ตรวจสอบว่ามีการกระจายตัวของสีที่ผิดปกติหรือไม่
  for (const channel of channels) {
    // ตรวจสอบว่ามีการกระจุกตัวของค่าสีมากเกินไปหรือไม่
    if (channel.min === channel.max || channel.entropy < 1.0) {
      unnaturalDistribution = true;
      break;
    }
  }
  
  return unnaturalDistribution;
}

function calculateImageTrustScore(metadata, stats, isEdited) {
  // คำนวณคะแนนความน่าเชื่อถือของภาพ (0-100)
  let score = 100;
  
  // หักคะแนนถ้ามีการแก้ไขภาพ
  if (isEdited) {
    score -= 30;
  }
  
  // หักคะแนนถ้าไม่มีข้อมูล EXIF
  if (!metadata.exif) {
    score -= 20;
  }
  
  // หักคะแนนถ้าไฟล์มีขนาดเล็กเกินไป (น้อยกว่า 100KB)
  if (stats.size < 100 * 1024) {
    score -= 15;
  }
  
  // หักคะแนนถ้าความละเอียดต่ำเกินไป
  if (metadata.width < 500 || metadata.height < 500) {
    score -= 15;
  }
  
  // ปรับคะแนนให้อยู่ในช่วง 0-100
  return Math.max(0, Math.min(100, score));
}

async function verifySlip(imagePath) {
  console.log(chalk.bgBlue.white.bold(' 📋 เริ่มตรวจสอบสลิปโอนเงิน... '));

  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error('ไม่พบไฟล์ภาพสลิป');
    }

    // ตรวจสอบ metadata ของรูปภาพ
    const imageMetadata = await extractImageMetadata(imagePath);
    
    const qrResult = await detectQRCode(imagePath);
    
    const preprocessedImagePath = await preprocessImage(imagePath);
    const ocrResult = await processImageWithOCR(preprocessedImagePath);
    const slipData = await analyzeSlipData(ocrResult, qrResult);
    
    // เพิ่ม metadata เข้าไปในผลลัพธ์
    slipData.metadata = imageMetadata;

    displayResult(slipData);

    if (fs.existsSync(preprocessedImagePath)) {
      fs.unlinkSync(preprocessedImagePath);
    }

    return slipData;
  } catch (error) {
    console.error(chalk.bgRed.white.bold(` ❌ ข้อผิดพลาด: ${error.message} `));
    return null;
  }
}

async function processImageWithOCR(imagePath) {
  const { data: { text } } = await recognize(imagePath, 'tha+eng', {
    logger: m => console.log(chalk.gray(JSON.stringify(m))),
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/:;()&@"\'- กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮฤฦะัาำิีึืุูเแโใไ็่้๊๋์',
    tessjs_create_pdf: '0',
    tessjs_create_hocr: '0',
    tessjs_create_tsv: '0',
    tessjs_create_box: '0',
    tessjs_create_unlv: '0',
    tessjs_create_osd: '0',
  });
  
  fs.writeFileSync('ocr_result.txt', text);
  console.log(chalk.gray('บันทึกผล OCR ไปยัง ocr_result.txt สำหรับการตรวจสอบ'));
  
  return text;
}

async function analyzeSlipData(ocrText, qrResult) {
  const bankPatterns = {
    'กสิกรไทย': /(กสิกร|KBANK|K\s*\+|K\s*PLUS|K\s*Bank|kasikorn)/i,
    'ไทยพาณิชย์': /(SCB|ไทยพาณิชย์|siam\s*commercial)/i,
    'กรุงเทพ': /(BBL|กรุงเทพ|bangkok\s*bank)/i,
    'กรุงไทย': /(KTB|กรุงไทย|krungthai)/i,
    'กรุงศรี': /(BAY|กรุงศรี|krungsri)/i,
    'ทหารไทยธนชาต': /(TTB|ทหารไทย|ธนชาต|TMB|TBANK)/i,
  };
  
  const datePatterns = [
    /(\d{1,2}\s*[ก-ฮ]{1,3}\.?\s*\d{2,4})/i,  
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,           
    /(\d{1,2}\-\d{1,2}\-\d{2,4})/,           
    /(\d{1,2}\s+[a-zA-Zก-ฮ]+\.?\s+\d{2,4})/i, 
    /(\d{1,2}\s+w\.g\.\s+\d{2})/i,           
  ];
  
  const amountPatterns = [
    /(\d{1,3}(?:,\d{3})*\.\d{2})/,          
    /จำนวนเงิน\s*(\d{1,3}(?:,\d{3})*\.\d{2})/i, 
    /เงิน\s*(\d{1,3}(?:,\d{3})*\.\d{2})/i,    
    /(\d+\.\d{2})\s*บาท/i,                  
    /บาท\s*(\d+\.\d{2})/i,                   
    /จํานวน:?\s*(\d+\.\d{2})/i,              
    /(\d+\.\d{2})/                          
  ];
  
  const promptPayPatterns = [
    /(PromptPay|พร้อมเพย์|พรอมเพย|พร้อมเพ|พรอมเพ|prompt\s*pay)/i,
    /(เลขอ้างอิงพร้อมเพย์|เลขอ้างอิง\s*พร้อมเพย์)/i
  ];
  
  const accountPatterns = [
    /\b(\d{10})\b/,                          
    /\b(\d{13})\b/,                          
    /\b(\d{3}\-\d{1,2}\-\d{5}\-\d{1,2})\b/,  
    /บัญชี[^\d]*(\d[\d\-]+)/i,               
    /เลขที่บัญชี[^\d]*(\d[\d\-]+)/i,         
    /xxx-x-x(\d{4})-x/i,                     
    /(\d{4,})/                               
  ];
  
  console.log(chalk.gray('กำลังวิเคราะห์ข้อมูล OCR:'));
  console.log(chalk.gray('----------------------------'));
  console.log(chalk.gray(ocrText));
  console.log(chalk.gray('----------------------------'));
  
  let bank = 'ไม่พบธนาคาร';
  for (const [bankName, pattern] of Object.entries(bankPatterns)) {
    if (pattern.test(ocrText)) {
      bank = bankName;
      console.log(chalk.green(`พบธนาคาร: ${bankName} (ตรงกับรูปแบบ ${pattern})`));
      break;
    }
  }
  
  let amount = 'ไม่พบจำนวนเงิน';
  for (const pattern of amountPatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      amount = match[1];
      console.log(chalk.green(`พบจำนวนเงิน: ${amount} (ตรงกับรูปแบบ ${pattern})`));
      break;
    }
  }
  
  let date = 'ไม่พบวันที่';
  for (const pattern of datePatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      date = match[1];
      console.log(chalk.green(`พบวันที่: ${date} (ตรงกับรูปแบบ ${pattern})`));
      break;
    }
  }
  
  let hasPromptPay = false;
  for (const pattern of promptPayPatterns) {
    if (pattern.test(ocrText)) {
      hasPromptPay = true;
      console.log(chalk.green(`พบ PromptPay (ตรงกับรูปแบบ ${pattern})`));
      break;
    }
  }
  
  let hasAccount = false;
  let accountNumber = null;
  for (const pattern of accountPatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      hasAccount = true;
      accountNumber = match[1];
      console.log(chalk.green(`พบเลขบัญชี: ${accountNumber} (ตรงกับรูปแบบ ${pattern})`));
      break;
    }
  }
  
  const slipSpecificPatterns = [
    /โอนเ[ง|จ]ินสําเร็จ/i,
    /เลขที่รายการ/i,
    /ค่าธรรมเนียม/i,
    /จํานวน/i,
    /ตรวจสอบสลิป/i
  ];
  
  let isSlipSpecific = false;
  for (const pattern of slipSpecificPatterns) {
    if (pattern.test(ocrText)) {
      isSlipSpecific = true;
      console.log(chalk.green(`พบข้อความเฉพาะของสลิป: ${pattern}`));
      break;
    }
  }
  
  const hasQR = qrResult.found || /QR\s*code|คิวอาร์โค้ด|คิวอาร์/i.test(ocrText);
  

  const isValid = (
    (bank !== 'ไม่พบธนาคาร' && amount !== 'ไม่พบจำนวนเงิน') &&
    (hasAccount || hasPromptPay || hasQR || date !== 'ไม่พบวันที่' || isSlipSpecific)
  );
  
  const bankSpecificPatterns = {
    'กสิกรไทย': /โอนเงินสำเร็จ|K\s*PLUS|K\s*\+/i,
    'ไทยพาณิชย์': /SCB\s*EASY|SCB\s*Transaction/i,
    'กรุงเทพ': /Bualuang\s*mBanking|บัวหลวง\s*เอ็มแบงก์กิ้ง/i
  };
  
  let bankConfidence = 0;
  if (bank !== 'ไม่พบธนาคาร' && bankSpecificPatterns[bank] && bankSpecificPatterns[bank].test(ocrText)) {
    bankConfidence = 1;
  }
  
  if (accountNumber && accountNumber.length === 4 && /^\d{4}$/.test(accountNumber)) {
    accountNumber = `xxx-x-x${accountNumber}-x`;
  }
  
  return {
    bank,
    amount,
    date,
    hasQR,
    hasPromptPay,
    hasAccount,
    accountNumber: accountNumber || 'ไม่พบเลขบัญชี',
    qrData: qrResult.data,
    isValid,
    bankConfidence,
    timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    ocrText: ocrText
  };
}

function displayResult(slipData) {
  const table = new Table({
    head: [chalk.cyan.bold('รายการ'), chalk.cyan.bold('ข้อมูล')],
    colWidths: [25, 45],
    chars: {
      'top': '═',
      'top-mid': '╤',
      'top-left': '╔',
      'top-right': '╗',
      'bottom': '═',
      'bottom-mid': '╧',
      'bottom-left': '╚',
      'bottom-right': '╝',
      'left': '║',
      'left-mid': '╟',
      'mid': '─',
      'mid-mid': '┼',
      'right': '║',
      'right-mid': '╢',
      'middle': '│'
    },
    style: {
      head: [],
      border: [],
      padding: [1, 1]
    }
  });

  table.push(
    ['ธนาคาร', chalk.yellow(slipData.bank)],
    ['จำนวนเงิน', chalk.green(slipData.amount)],
    ['วันที่', chalk.blue(slipData.date)],
    ['เลขบัญชี', chalk.magenta(slipData.accountNumber)],
    ['มี QR Code', slipData.hasQR ? chalk.green('✓ ใช่') : chalk.red('✗ ไม่มี')],
    ['มี PromptPay', slipData.hasPromptPay ? chalk.green('✓ ใช่') : chalk.red('✗ ไม่มี')],
    ['มีเลขบัญชี', slipData.hasAccount ? chalk.green('✓ ใช่') : chalk.red('✗ ไม่มี')],
    ['สถานะ', slipData.isValid ? chalk.bgGreen.black(' สลิปจริง ') : chalk.bgRed.white(' สลิปปลอม ')],
    ['ตรวจสอบเมื่อ', chalk.gray(slipData.timestamp)],
  );

  if (slipData.qrData) {
    table.push(['ข้อมูล QR Code', chalk.gray(slipData.qrData)]);
  }
  
  // แสดงข้อมูล metadata ถ้ามี
  if (slipData.metadata) {
    table.push(
      ['ขนาดไฟล์', chalk.cyan(slipData.metadata.fileSize)],
      ['ความละเอียด', chalk.cyan(slipData.metadata.dimensions)],
      ['รูปแบบไฟล์', chalk.cyan(slipData.metadata.format)],
      ['วันที่สร้างไฟล์', chalk.cyan(slipData.metadata.creationTime)],
      ['มีข้อมูล EXIF', slipData.metadata.exif ? chalk.green('✓ มี') : chalk.red('✗ ไม่มี')],
      ['มีการแก้ไขภาพ', slipData.metadata.isEdited ? chalk.red('✓ มีการแก้ไข') : chalk.green('✗ ไม่มีการแก้ไข')],
      ['คะแนนความน่าเชื่อถือ', getTrustScoreDisplay(slipData.metadata.trustScore)]
    );
  }

  console.log(table.toString());
  console.log(chalk.bgMagenta.white.bold(` ✅ การตรวจสอบเสร็จสิ้น `));
}

function getTrustScoreDisplay(score) {
  if (score >= 80) {
    return chalk.green(`${score}/100 (สูง)`);
  } else if (score >= 50) {
    return chalk.yellow(`${score}/100 (ปานกลาง)`);
  } else {
    return chalk.red(`${score}/100 (ต่ำ)`);
  }
}

async function trainModel(imagePath, correctData) {
  console.log(chalk.bgYellow.black(' 🧠 กำลังเรียนรู้จากข้อมูลใหม่... '));
  
  try {
    const trainingDataPath = path.join(__dirname, 'training_data.json');
    let trainingData = [];
    
    if (fs.existsSync(trainingDataPath)) {
      trainingData = JSON.parse(fs.readFileSync(trainingDataPath, 'utf8'));
    }
    
    const preprocessedImagePath = await preprocessImage(imagePath);
    const ocrResult = await processImageWithOCR(preprocessedImagePath);
    
    trainingData.push({
      ocrText: ocrResult,
      correctData: correctData,
      imagePath: imagePath,
      timestamp: new Date().toISOString()
    });
    
    fs.writeFileSync(trainingDataPath, JSON.stringify(trainingData, null, 2));
    
    if (fs.existsSync(preprocessedImagePath)) {
      fs.unlinkSync(preprocessedImagePath);
    }
    
    console.log(chalk.green(`✓ เพิ่มข้อมูลฝึกสอนสำเร็จ (ทั้งหมด ${trainingData.length} รายการ)`));
    return true;
  } catch (error) {
    console.error(chalk.red(`✗ ไม่สามารถเพิ่มข้อมูลฝึกสอน: ${error.message}`));
    return false;
  }
}

async function verifyAllSlips(directoryPath = 'Slip') {
  console.log(chalk.bgBlue.white.bold(` 📋 เริ่มตรวจสอบสลิปทั้งหมดในโฟลเดอร์ ${directoryPath}... `));
  
  try {
    const fullDirectoryPath = path.join(__dirname, directoryPath);
    
    if (!fs.existsSync(fullDirectoryPath)) {
      throw new Error(`ไม่พบโฟลเดอร์ ${directoryPath}`);
    }
    
    const files = fs.readdirSync(fullDirectoryPath);
    
    if (files.length === 0) {
      console.log(chalk.yellow(`ไม่พบไฟล์ใดๆ ในโฟลเดอร์ ${directoryPath}`));
      return [];
    }
    
    console.log(chalk.blue(`พบไฟล์ทั้งหมด ${files.length} ไฟล์`));
    
    const results = [];
    let validCount = 0;
    let invalidCount = 0;
    
    for (const file of files) {
      const filePath = path.join(fullDirectoryPath, file);
      
      // ข้ามไฟล์ที่เป็นโฟลเดอร์
      if (fs.statSync(filePath).isDirectory()) {
        console.log(chalk.gray(`ข้าม ${file} (เป็นโฟลเดอร์)`));
        continue;
      }
      
      console.log(chalk.cyan(`\n--- กำลังตรวจสอบ: ${file} ---`));
      
      try {
        const slipData = await verifySlip(filePath);
        
        if (slipData) {
          results.push({
            filename: file,
            ...slipData
          });
          
          if (slipData.isValid) {
            validCount++;
          } else {
            invalidCount++;
          }
        }
      } catch (error) {
        console.error(chalk.red(`ไม่สามารถตรวจสอบไฟล์ ${file}: ${error.message}`));
        results.push({
          filename: file,
          error: error.message,
          isValid: false
        });
        invalidCount++;
      }
    }
    
    // แสดงสรุปผลการตรวจสอบ
    console.log(chalk.bgMagenta.white.bold(`\n 📊 สรุปผลการตรวจสอบ `));
    console.log(chalk.green(`✓ สลิปที่ถูกต้อง: ${validCount} ไฟล์`));
    console.log(chalk.red(`✗ สลิปที่ไม่ถูกต้อง: ${invalidCount} ไฟล์`));
    console.log(chalk.blue(`📁 ตรวจสอบทั้งหมด: ${results.length} ไฟล์`));
    
    return results;
  } catch (error) {
    console.error(chalk.bgRed.white.bold(` ❌ ข้อผิดพลาด: ${error.message} `));
    return [];
  }
}

export { verifySlip, trainModel, verifyAllSlips };