#!/usr/bin/env node

/**
 * Database Compression Script
 * 
 * Sử dụng: node compress-backup.js
 * 
 * Script này sẽ nén file backup thành .zip
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const log = {
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  info: (msg) => console.log(`ℹ️  ${msg}`),
};

const compressBackup = async () => {
  try {
    const backupDir = path.join(__dirname, 'backups');
    
    if (!fs.existsSync(backupDir)) {
      log.error('Thư mục backups không tồn tại!');
      process.exit(1);
    }

    // Lấy file backup mới nhất
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('database_backup_') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      log.error('Không tìm thấy file backup!');
      process.exit(1);
    }

    const latestBackup = files[0];
    const backupPath = path.join(backupDir, latestBackup);
    const zipPath = path.join(backupDir, latestBackup.replace('.json', '.zip'));

    log.info(`Đang nén: ${latestBackup}`);

    // Tạo file zip
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        const originalSize = (fs.statSync(backupPath).size / 1024 / 1024).toFixed(2);
        const zipSize = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(2);
        
        log.success(`Nén thành công!`);
        console.log(`
  📁 File gốc: ${originalSize} MB
  📦 File nén: ${zipSize} MB
  ✨ Tỷ lệ nén: ${((1 - zipSize / originalSize) * 100).toFixed(1)}%
  
  📍 Vị trí: ${zipPath}
        `);
        resolve();
      });

      archive.on('error', (err) => {
        log.error(`Lỗi nén: ${err.message}`);
        reject(err);
      });

      archive.pipe(output);
      archive.file(backupPath, { name: latestBackup });
      archive.finalize();
    });

  } catch (error) {
    log.error(`Lỗi: ${error.message}`);
    process.exit(1);
  }
};

compressBackup();
