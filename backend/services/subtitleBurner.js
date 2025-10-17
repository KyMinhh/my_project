const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class SubtitleBurner {
  async burnSubtitles(videoPath, subtitlePath, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        fontName = 'Arial',
        fontSize = 24,
        fontColor = 'white',
        backgroundColor = 'black@0.5',
        position = 'bottom',
        marginV = 20,
        borderStyle = 1,
        outline = 2,
        shadow = 1
      } = options;

      const subtitleStyle = `force_style='FontName=${fontName},FontSize=${fontSize},PrimaryColour=&H${this.colorToHex(fontColor)},BackColour=&H${this.colorToHex(backgroundColor)},BorderStyle=${borderStyle},Outline=${outline},Shadow=${shadow},MarginV=${marginV}'`;

      // Escape path for FFmpeg - use forward slashes and escape special chars
      const normalizedSubPath = path.resolve(subtitlePath).replace(/\\/g, '/').replace(/:/g, '\\:');
      
      const args = [
        '-i', videoPath,
        '-vf', `subtitles='${normalizedSubPath}':${subtitleStyle}`,
        '-c:a', 'copy',
        '-y',
        outputPath
      ];

      const ffmpeg = spawn('ffmpeg', args);

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`FFmpeg: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  async burnMultiLanguageSubtitles(videoPath, subtitlePaths, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        defaultLanguage = 'en',
        fontName = 'Arial',
        fontSize = 24
      } = options;

      const metadataArgs = [];
      const mapArgs = ['-map', '0:v', '-map', '0:a'];

      Object.entries(subtitlePaths).forEach(([lang, subtitlePath], index) => {
        mapArgs.push('-map', `${index + 1}:s`);
        metadataArgs.push(`-metadata:s:s:${index}`, `language=${lang}`);
        if (lang === defaultLanguage) {
          metadataArgs.push(`-disposition:s:${index}`, 'default');
        }
      });

      const inputArgs = ['-i', videoPath];
      Object.values(subtitlePaths).forEach(subtitlePath => {
        inputArgs.push('-i', subtitlePath);
      });

      const args = [
        ...inputArgs,
        ...mapArgs,
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-c:s', 'mov_text',
        ...metadataArgs,
        '-y',
        outputPath
      ];

      const ffmpeg = spawn('ffmpeg', args);

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`FFmpeg: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  async hardBurnSubtitle(videoPath, subtitlePath, outputPath, options = {}) {
    const {
      fontName = 'Arial',
      fontSize = 24,
      primaryColor = '&HFFFFFF',
      outlineColor = '&H000000',
      backColor = '&H80000000',
      bold = 0,
      italic = 0,
      borderStyle = 1,
      outline = 2,
      shadow = 1,
      alignment = 2,
      marginV = 20,
      marginL = 10,
      marginR = 10
    } = options;

    return new Promise((resolve, reject) => {
      // Escape path for FFmpeg - use forward slashes and escape special chars
      const normalizedSubPath = path.resolve(subtitlePath).replace(/\\/g, '/').replace(/:/g, '\\:');
      
      const subtitleFilter = `subtitles='${normalizedSubPath}':force_style='FontName=${fontName},FontSize=${fontSize},PrimaryColour=${primaryColor},OutlineColour=${outlineColor},BackColour=${backColor},Bold=${bold},Italic=${italic},BorderStyle=${borderStyle},Outline=${outline},Shadow=${shadow},Alignment=${alignment},MarginV=${marginV},MarginL=${marginL},MarginR=${marginR}'`;

      const args = [
        '-i', videoPath,
        '-vf', subtitleFilter,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'copy',
        '-y',
        outputPath
      ];

      const ffmpeg = spawn('ffmpeg', args);

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`FFmpeg: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  colorToHex(color) {
    const colorMap = {
      'white': 'FFFFFF',
      'black': '000000',
      'red': 'FF0000',
      'green': '00FF00',
      'blue': '0000FF',
      'yellow': 'FFFF00',
      'cyan': '00FFFF',
      'magenta': 'FF00FF'
    };

    if (color.includes('@')) {
      const [baseColor, opacity] = color.split('@');
      const hex = colorMap[baseColor.toLowerCase()] || 'FFFFFF';
      const alpha = Math.round(parseFloat(opacity) * 255).toString(16).padStart(2, '0');
      return alpha + hex;
    }

    return colorMap[color.toLowerCase()] || color.replace('#', '');
  }

  async getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', videoPath,
        '-hide_banner'
      ];

      const ffprobe = spawn('ffprobe', args);

      let stderr = '';

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}.\d{2})/);
        const resolutionMatch = stderr.match(/(\d{3,4})x(\d{3,4})/);

        if (durationMatch && resolutionMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          const duration = hours * 3600 + minutes * 60 + seconds;

          resolve({
            duration,
            width: parseInt(resolutionMatch[1]),
            height: parseInt(resolutionMatch[2])
          });
        } else {
          reject(new Error('Could not parse video information'));
        }
      });

      ffprobe.on('error', (error) => {
        reject(new Error(`FFprobe spawn error: ${error.message}`));
      });
    });
  }
}

module.exports = new SubtitleBurner();
