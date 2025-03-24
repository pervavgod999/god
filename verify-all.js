import { verifyAllSlips } from './api.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.bgBlue.white.bold(' 🔍 โปรแกรมตรวจสอบสลิปทั้งหมด '));

const directoryPath = process.argv[2] || 'Slip';

console.log(chalk.blue(`กำลังตรวจสอบทุกไฟล์ในโฟลเดอร์: ${directoryPath}`));

verifyAllSlips(directoryPath)
  .then(results => {
    console.log(chalk.green('การตรวจสอบทั้งหมดเสร็จสิ้น'));
    
    const trainingDataPath = path.join(__dirname, 'training_data.json');
    let trainingData = [];
    
    if (fs.existsSync(trainingDataPath)) {
      try {
        trainingData = JSON.parse(fs.readFileSync(trainingDataPath, 'utf8'));
      } catch (error) {
        console.error(chalk.yellow(`ไม่สามารถอ่านไฟล์ training_data.json: ${error.message}`));
        console.log(chalk.yellow('สร้างไฟล์ใหม่...'));
      }
    }
    
    const timestamp = new Date().toISOString();
    
    results.forEach(result => {
      if (result.isValid) {
        trainingData.push({
          ocrText: result.ocrText || "ไม่มีข้อมูล OCR",
          correctData: {
            bank: result.bank,
            amount: result.amount,
            date: result.date,
            accountNumber: result.accountNumber,
            hasQR: result.hasQR,
            hasPromptPay: result.hasPromptPay,
            isValid: result.isValid
          },
          imagePath: path.join(directoryPath, result.filename),
          timestamp: timestamp
        });
      }
    });
    
    fs.writeFileSync(trainingDataPath, JSON.stringify(trainingData, null, 2));
    
    console.log(chalk.green(`✓ บันทึกข้อมูลลงในไฟล์ training_data.json สำเร็จ (ทั้งหมด ${trainingData.length} รายการ)`));
  })
  .catch(error => {
    console.error(chalk.red(`เกิดข้อผิดพลาด: ${error.message}`));
    process.exit(1);
  }); 