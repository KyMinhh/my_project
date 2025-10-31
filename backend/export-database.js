#!/usr/bin/env node

/**
 * Database Export Script
 * 
 * Sử dụng: node export-database.js
 * 
 * Script này sẽ export toàn bộ database MongoDB thành file JSON
 * Kết quả: database_backup_TIMESTAMP.json
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
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
  title: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}\n`),
};

const exportDatabase = async () => {
  try {
    log.title('🗄️  MongoDB Database Export');

    // 1. Kết nối MongoDB
    log.info('Đang kết nối tới MongoDB...');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI không được định nghĩa trong file .env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    log.success(`Kết nối thành công tới: ${process.env.MONGO_URI.split('@')[1]}`);

    // 2. Lấy danh sách tất cả collections
    log.info('Đang lấy danh sách collections...');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      log.warn('Không tìm thấy collections nào!');
      await mongoose.connection.close();
      return;
    }

    log.success(`Tìm thấy ${collections.length} collections`);

    // 3. Export từng collection
    const backupData = {};
    let totalDocuments = 0;

    for (const collection of collections) {
      const collectionName = collection.name;
      
      // Skip system collections
      if (collectionName.startsWith('system.')) {
        continue;
      }

      process.stdout.write(`  📦 Đang export "${collectionName}"... `);

      try {
        const documents = await db.collection(collectionName).find({}).toArray();
        backupData[collectionName] = documents;
        totalDocuments += documents.length;
        
        console.log(`${colors.green}[${documents.length} documents]${colors.reset}`);
      } catch (error) {
        console.log(`${colors.red}[Lỗi: ${error.message}]${colors.reset}`);
      }
    }

    // 4. Lưu vào file JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('Z')[0];
    const backupDir = path.join(__dirname, 'backups');
    
    // Tạo folder backups nếu chưa có
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = path.join(backupDir, `database_backup_${timestamp}.json`);
    
    log.info(`Đang lưu dữ liệu...`);
    fs.writeFileSync(filename, JSON.stringify(backupData, null, 2), 'utf-8');

    // 5. Thống kê
    const fileSize = (fs.statSync(filename).size / 1024 / 1024).toFixed(2);

    log.title('✨ Export Thành Công!');
    console.log(`
  📁 File được lưu tại: ${filename}
  📊 Tổng số documents: ${totalDocuments}
  💾 Kích thước file: ${fileSize} MB
  ⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}

  💡 Tiếp theo:
     - Kiểm tra file: backups/database_backup_*.json
     - Nén file: zip database_backup_*.json (nếu cần)
     - Gửi giảng viên hoặc backup
    `);

    // 6. Tạo file metadata
    const metadata = {
      exportDate: new Date().toISOString(),
      mongoUri: process.env.MONGO_URI.split('@')[1],
      totalCollections: Object.keys(backupData).length,
      totalDocuments: totalDocuments,
      collections: Object.keys(backupData).map(name => ({
        name,
        documentCount: backupData[name].length
      }))
    };

    const metadataFile = path.join(backupDir, `metadata_${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
    log.info(`Metadata được lưu tại: ${metadataFile}`);

    // 7. Đóng kết nối
    await mongoose.connection.close();
    log.success('Kết nối MongoDB đã đóng');

  } catch (error) {
    log.error(`Lỗi: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

// Chạy export
exportDatabase();
