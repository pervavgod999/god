import { verifySlip, trainModel, verifyAllSlips } from './api.js';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

yargs(hideBin(process.argv))
  .command('verify [imagePath]', 'ตรวจสอบสลิปโอนเงิน', (yargs) => {
    return yargs
      .positional('imagePath', {
        describe: 'พาธของไฟล์ภาพสลิป',
        default: 'slip.jpg'
      });
  }, async (argv) => {
    const imagePath = path.resolve(process.cwd(), argv.imagePath);
    
    if (!fs.existsSync(imagePath)) {
      console.error(chalk.red(`ไม่พบไฟล์ภาพที่ระบุ: ${imagePath}`));
      process.exit(1);
    }
    
    console.log(chalk.blue(`กำลังตรวจสอบสลิป: ${imagePath}`));
    
    try {
      await verifySlip(imagePath);
    } catch (error) {
      console.error(chalk.red(`เกิดข้อผิดพลาด: ${error.message}`));
      process.exit(1);
    }
  })
  .command('train [imagePath]', 'เพิ่มข้อมูลฝึกสอนสำหรับโมเดล', (yargs) => {
    return yargs
      .positional('imagePath', {
        describe: 'พาธของไฟล์ภาพสลิป',
        default: 'slip.jpg'
      })
      .option('bank', {
        describe: 'ชื่อธนาคาร',
        type: 'string'
      })
      .option('amount', {
        describe: 'จำนวนเงิน',
        type: 'string'
      })
      .option('date', {
        describe: 'วันที่โอนเงิน',
        type: 'string'
      })
      .option('account', {
        describe: 'เลขบัญชี',
        type: 'string'
      })
      .option('hasQR', {
        describe: 'มี QR Code หรือไม่',
        type: 'boolean'
      })
      .option('hasPromptPay', {
        describe: 'มี PromptPay หรือไม่',
        type: 'boolean'
      })
      .option('isValid', {
        describe: 'เป็นสลิปจริงหรือไม่',
        type: 'boolean',
        default: true
      });
  }, async (argv) => {
    const imagePath = path.resolve(process.cwd(), argv.imagePath);
    
    if (!fs.existsSync(imagePath)) {
      console.error(chalk.red(`ไม่พบไฟล์ภาพที่ระบุ: ${imagePath}`));
      process.exit(1);
    }
    
    console.log(chalk.blue(`กำลังเพิ่มข้อมูลฝึกสอนจากสลิป: ${imagePath}`));
    
    const correctData = {
      bank: argv.bank,
      amount: argv.amount,
      date: argv.date,
      accountNumber: argv.account,
      hasQR: argv.hasQR,
      hasPromptPay: argv.hasPromptPay,
      isValid: argv.isValid
    };
    
    try {
      await trainModel(imagePath, correctData);
    } catch (error) {
      console.error(chalk.red(`เกิดข้อผิดพลาด: ${error.message}`));
      process.exit(1);
    }
  })
  .command('batch [directory]', 'ตรวจสอบสลิปหลายไฟล์ในโฟลเดอร์', (yargs) => {
    return yargs
      .positional('directory', {
        describe: 'โฟลเดอร์ที่มีไฟล์ภาพสลิป',
        default: './slips'
      });
  }, async (argv) => {
    const directory = path.resolve(process.cwd(), argv.directory);
    
    if (!fs.existsSync(directory)) {
      console.error(chalk.red(`ไม่พบโฟลเดอร์ที่ระบุ: ${directory}`));
      process.exit(1);
    }
    
    console.log(chalk.blue(`กำลังตรวจสอบสลิปในโฟลเดอร์: ${directory}`));
    
    try {
      const files = fs.readdirSync(directory);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|gif)$/i.test(file)
      );
      
      if (imageFiles.length === 0) {
        console.log(chalk.yellow('ไม่พบไฟล์ภาพในโฟลเดอร์'));
        process.exit(0);
      }
      
      console.log(chalk.blue(`พบไฟล์ภาพทั้งหมด ${imageFiles.length} ไฟล์`));
      
      for (const file of imageFiles) {
        const imagePath = path.join(directory, file);
        console.log(chalk.cyan(`\n--- กำลังตรวจสอบ: ${file} ---`));
        await verifySlip(imagePath);
      }
      
    } catch (error) {
      console.error(chalk.red(`เกิดข้อผิดพลาด: ${error.message}`));
      process.exit(1);
    }
  })
  .command('verify-all [directory]', 'ตรวจสอบทุกไฟล์ในโฟลเดอร์ (รองรับทุกนามสกุลไฟล์)', (yargs) => {
    return yargs
      .positional('directory', {
        describe: 'โฟลเดอร์ที่มีไฟล์สลิป',
        default: 'Slip'
      });
  }, async (argv) => {
    try {
      const directory = argv.directory;
      console.log(chalk.blue(`กำลังตรวจสอบทุกไฟล์ในโฟลเดอร์: ${directory}`));
      
      await verifyAllSlips(directory);
      
      console.log(chalk.green('การตรวจสอบทั้งหมดเสร็จสิ้น'));
    } catch (error) {
      console.error(chalk.red(`เกิดข้อผิดพลาด: ${error.message}`));
      process.exit(1);
    }
  })
  .demandCommand(1, 'คุณต้องระบุคำสั่งที่ต้องการใช้งาน')
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .epilogue('สำหรับข้อมูลเพิ่มเติม: https://github.com/yourusername/slip-verification')
  .argv; 