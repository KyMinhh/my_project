#!/usr/bin/env node

/**
 * Database Import Script
 * 
 * Sử dụng: node import-database.js [file_path]
 * 
 * Ví dụ: node import-database.js backups/database_backup_2024-01-15.json
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

const importDatabase = async () => {
  try {
    // 1. Kiểm tra file input
    const backupFile = process.argv[2];
    
    if (!backupFile) {
      log.error('Vui lòng chỉ định file backup!');
      console.log('\nCách sử dụng: node import-database.js <file_path>');
      console.log('Ví dụ: node import-database.js backups/database_backup_2024-01-15.json\n');
      process.exit(1);
    }

    const filePath = path.resolve(backupFile);

    if (!fs.existsSync(filePath)) {
      log.error(`File không tồn tại: ${filePath}`);
      process.exit(1);
    }

    // 2. Đọc file JSON
    log.info('Đang đọc file backup...');
    const backupData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const collections = Object.keys(backupData);

    log.success(`Tìm thấy ${collections.length} collections`);

    // 3. Kết nối MongoDB
    log.info('Đang kết nối tới MongoDB...');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI không được định nghĩa trong file .env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    log.success('Kết nối thành công');

    // 4. Confirm trước khi xóa dữ liệu cũ
    const db = mongoose.connection.db;
    
    log.warn('Cảnh báo: Dữ liệu cũ sẽ bị XÓA và thay thế bằng dữ liệu từ file backup!');
    console.log('\nCollections sẽ được xóa:');
    collections.forEach(col => {
      console.log(`  - ${col}`);
    });

    // 5. Import dữ liệu
    let totalInserted = 0;

    for (const collectionName of collections) {
      const documents = backupData[collectionName];
      const collection = db.collection(collectionName);

      process.stdout.write(`  📥 Đang import "${collectionName}"... `);

      try {
        // Xóa dữ liệu cũ
        await collection.deleteMany({});

        // Insert dữ liệu mới
        if (documents.length > 0) {
          await collection.insertMany(documents);
        }

        totalInserted += documents.length;
        console.log(`${colors.green}[${documents.length} documents]${colors.reset}`);
      } catch (error) {
        console.log(`${colors.red}[Lỗi: ${error.message}]${colors.reset}`);
      }
    }

    // 6. Kết quả
    log.success(`\nImport hoàn thành!`);
    console.log(`
  📊 Tổng documents imported: ${totalInserted}
  ⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}
    `);

    // 7. Đóng kết nối
    await mongoose.connection.close();
    log.success('Kết nối MongoDB đã đóng');

  } catch (error) {
    log.error(`Lỗi: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

importDatabase();
