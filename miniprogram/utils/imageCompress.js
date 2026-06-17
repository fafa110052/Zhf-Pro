/**
 * 图片压缩工具
 *
 * 在上传前对图片进行压缩，减少流量消耗和上传时间。
 * 策略：优先用 wx.compressImage（基础库 2.25+），
 *       降级到 canvas 绘制压缩。
 *
 * 压缩目标：长边 ≤ 1920px，品质 0.8，输出 ≤ 500KB
 */

const MAX_EDGE = 1920;       // 长边最大像素
const QUALITY = 80;           // JPEG 品质 (0-100)
const TARGET_SIZE_KB = 500;   // 目标文件大小

/**
 * 压缩单张图片
 * @param {string} filePath — 本地图片路径
 * @returns {Promise<string>} — 压缩后的临时文件路径
 */
function compressImage(filePath) {
  // 优先使用原生 API（基础库 ≥ 2.25.0）
  if (typeof wx.compressImage === 'function') {
    return compressWithAPI(filePath);
  }
  return compressWithCanvas(filePath);
}

/**
 * 使用 wx.compressImage 压缩
 */
function compressWithAPI(filePath) {
  return new Promise((resolve) => {
    wx.compressImage({
      src: filePath,
      quality: QUALITY,
      compressedWidth: MAX_EDGE,
      success(res) {
        resolve(res.tempFilePath);
      },
      fail() {
        // 降级：压缩失败则用原图
        console.warn('[compressImage] API 压缩失败，使用原图:', filePath);
        resolve(filePath);
      },
    });
  });
}

/**
 * 使用 Canvas 压缩（兜底方案）
 * 流程：获取图片信息 → 计算目标尺寸 → 画布绘制 → 导出
 */
function compressWithCanvas(filePath) {
  return new Promise((resolve) => {
    wx.getImageInfo({
      src: filePath,
      success(imgInfo) {
        const { targetW, targetH } = calcSize(imgInfo.width, imgInfo.height);

        // 无需压缩
        if (targetW >= imgInfo.width && targetH >= imgInfo.height) {
          resolve(filePath);
          return;
        }

        // 使用离屏 canvas（基础库 ≥ 2.9.0）
        const canvasId = 'compress-canvas';
        try {
          const ctx = wx.createCanvasContext(canvasId);
          ctx.drawImage(filePath, 0, 0, targetW, targetH);
          ctx.draw(false, () => {
            wx.canvasToTempFilePath({
              canvasId,
              x: 0,
              y: 0,
              width: targetW,
              height: targetH,
              destWidth: targetW,
              destHeight: targetH,
              quality: QUALITY / 100,
              fileType: 'jpg',
              success(res2) {
                resolve(res2.tempFilePath);
              },
              fail() {
                console.warn('[compressImage] Canvas 导出失败，使用原图:', filePath);
                resolve(filePath);
              },
            });
          });
        } catch (e) {
          console.warn('[compressImage] Canvas 创建失败，使用原图:', e);
          resolve(filePath);
        }
      },
      fail() {
        resolve(filePath);
      },
    });
  });
}

/**
 * 计算缩放后的宽高（等比缩放，长边限制）
 */
function calcSize(origW, origH) {
  if (origW <= MAX_EDGE && origH <= MAX_EDGE) {
    return { targetW: origW, targetH: origH };
  }

  const ratio = Math.min(MAX_EDGE / origW, MAX_EDGE / origH);
  return {
    targetW: Math.round(origW * ratio),
    targetH: Math.round(origH * ratio),
  };
}

/**
 * 批量压缩图片
 * @param {string[]} filePaths
 * @returns {Promise<string[]>} — 压缩后的路径数组
 */
async function compressImages(filePaths) {
  const results = [];
  for (const fp of filePaths) {
    try {
      const compressed = await compressImage(fp);
      results.push(compressed);
    } catch {
      results.push(fp); // 压缩失败保留原图
    }
  }
  return results;
}

module.exports = {
  compressImage,
  compressImages,
};
