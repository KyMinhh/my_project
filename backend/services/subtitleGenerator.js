const fs = require('fs').promises;
const path = require('path');

class SubtitleGenerator {
  formatTime(seconds, format = 'srt') {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    if (format === 'srt') {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
    } else if (format === 'vtt') {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }
  }

  generateSRT(segments) {
    let srtContent = '';
    
    segments.forEach((segment, index) => {
      const startTime = this.formatTime(segment.start || segment.startTime || 0, 'srt');
      const endTime = this.formatTime(segment.end || segment.endTime || (segment.start || segment.startTime || 0) + 2, 'srt');
      const text = segment.text || segment.content || '';

      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${text.trim()}\n\n`;
    });

    return srtContent;
  }

  generateVTT(segments) {
    let vttContent = 'WEBVTT\n\n';
    
    segments.forEach((segment, index) => {
      const startTime = this.formatTime(segment.start || segment.startTime || 0, 'vtt');
      const endTime = this.formatTime(segment.end || segment.endTime || (segment.start || segment.startTime || 0) + 2, 'vtt');
      const text = segment.text || segment.content || '';

      vttContent += `${index + 1}\n`;
      vttContent += `${startTime} --> ${endTime}\n`;
      vttContent += `${text.trim()}\n\n`;
    });

    return vttContent;
  }

  async saveSubtitleFile(segments, format = 'srt', outputPath) {
    let content;
    
    if (format === 'srt') {
      content = this.generateSRT(segments);
    } else if (format === 'vtt') {
      content = this.generateVTT(segments);
    } else {
      throw new Error(`Unsupported subtitle format: ${format}`);
    }

    await fs.writeFile(outputPath, content, 'utf-8');
    return outputPath;
  }

  async generateMultiLanguageSubtitles(transcriptData, outputDir) {
    const results = {};

    for (const [language, segments] of Object.entries(transcriptData)) {
      const srtPath = path.join(outputDir, `${language}.srt`);
      const vttPath = path.join(outputDir, `${language}.vtt`);

      await this.saveSubtitleFile(segments, 'srt', srtPath);
      await this.saveSubtitleFile(segments, 'vtt', vttPath);

      results[language] = {
        srt: srtPath,
        vtt: vttPath
      };
    }

    return results;
  }
}

module.exports = new SubtitleGenerator();
