import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { stampExtractorService } from '../src/services/stampExtractor.js';

describe('StampExtractorService (TDD Unit Tests)', () => {
  /**
   * 輔助函式：建立合成測試圖片
   * 包含：白色底紙、斜向深灰色手機陰影、中央紅色或藍色印章
   */
  async function createSyntheticTestImage(
    stampColor: 'red' | 'blue' | 'none',
    width = 200,
    height = 200
  ): Promise<Buffer> {
    const channels = 4;
    const data = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;

        // 模擬光線與手機陰影 (左上亮白 245，右下深陰影 90)
        const shadowGrad = Math.max(80, 245 - ((x + y) / (width + height)) * 160);
        let r = shadowGrad;
        let g = shadowGrad;
        let b = shadowGrad;

        // 在中央 (cx: 100, cy: 100, r: 35) 繪製印章
        const distFromCenter = Math.sqrt((x - width / 2) ** 2 + (y - height / 2) ** 2);
        if (distFromCenter < 35 && distFromCenter > 5) {
          if (stampColor === 'red') {
            // 紅印泥：高紅、低綠藍 (受陰影調和)
            r = Math.min(255, 180 + Math.floor(shadowGrad * 0.2));
            g = 30;
            b = 30;
          } else if (stampColor === 'blue') {
            // 藍印泥：高藍、低紅綠
            r = 25;
            g = 35;
            b = Math.min(255, 190 + Math.floor(shadowGrad * 0.2));
          }
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255; // 完全不透明
      }
    }

    return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  }

  it('應成功擷取紅色印章並徹底去除白紙與深色陰影', async () => {
    const inputBuffer = await createSyntheticTestImage('red', 200, 200);
    const result = await stampExtractorService.extractStamp(inputBuffer, {
      colorMode: 'red',
      threshold: 35,
      shadowSuppression: 60,
      autoCrop: false
    });

    expect(result.mimeType).toBe('image/png');
    expect(result.detectedColor).toBe('red');

    // 檢驗處理後之像素
    const { data: outRaw } = await sharp(result.imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 1. 檢驗陰影角落 (x: 180, y: 180) 是否已完全透明 (Alpha = 0)
    const shadowPixelAlpha = outRaw[(180 * 200 + 180) * 4 + 3];
    expect(shadowPixelAlpha).toBe(0);

    // 2. 檢驗亮處角落 (x: 20, y: 20) 是否已完全透明 (Alpha = 0)
    const brightPaperAlpha = outRaw[(20 * 200 + 20) * 4 + 3];
    expect(brightPaperAlpha).toBe(0);

    // 3. 檢驗印章中心圓環處 (x: 100, y: 80) 是否保留高透明度 (Alpha > 200)
    const stampPixelAlpha = outRaw[(80 * 200 + 100) * 4 + 3];
    expect(stampPixelAlpha).toBeGreaterThan(200);
  });

  it('應成功自動識別並擷取藍色印章', async () => {
    const inputBuffer = await createSyntheticTestImage('blue', 200, 200);
    const result = await stampExtractorService.extractStamp(inputBuffer, {
      colorMode: 'auto',
      threshold: 35,
      shadowSuppression: 60,
      autoCrop: true
    });

    expect(result.detectedColor).toBe('blue');
    expect(result.boundingBox).toBeDefined();
    expect(result.width).toBeLessThan(200); // autoCrop 成功縮減多餘透明白邊
  });

  it('當圖片尺寸無效或損毀時應妥善拋出錯誤', async () => {
    const invalidBuffer = Buffer.from('invalid-image-binary');
    await expect(stampExtractorService.extractStamp(invalidBuffer)).rejects.toThrow();
  });

  it('應自動排除相片最外圈邊界拍到的桌面背景與外圍雜訊，自動聚焦於中央印章集中區', async () => {
    // 建立 240x240 測試圖：
    // - 中央 (120, 120, r: 30) 為正牌紅色印章
    // - 四周最外圍邊界 (x < 10 或 y < 10) 模擬拍到的棕紅木質桌面或外圍紅邊雜訊
    const width = 240;
    const height = 240;
    const channels = 4;
    const data = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        let r = 240, g = 240, b = 240; // 白紙

        // 外緣接觸邊界背景 (例如棕紅桌面雜訊)
        if (x < 12 || y < 12 || x > width - 12 || y > height - 12) {
          r = 200;
          g = 60;
          b = 40; // 偏紅桌面雜訊
        }

        // 中央印章 (cx: 120, cy: 120, 半徑 30)
        const dist = Math.sqrt((x - 120) ** 2 + (y - 120) ** 2);
        if (dist <= 30 && dist >= 8) {
          r = 230;
          g = 20;
          b = 20; // 印章
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    const testImgBuffer = await sharp(data, { raw: { width, height, channels } }).png().toBuffer();
    const result = await stampExtractorService.extractStamp(testImgBuffer, {
      colorMode: 'red',
      threshold: 35,
      autoCrop: true,
      padding: 10
    });

    expect(result.boundingBox).toBeDefined();
    // 印章半徑 30，直徑約 60，加上 padding 10，尺寸應在 70~100 之間，絕不應涵蓋到外圍 240 邊界！
    expect(result.width).toBeLessThan(120);
    expect(result.height).toBeLessThan(120);
    expect(result.boundingBox!.minX).toBeGreaterThan(60);
    expect(result.boundingBox!.minY).toBeGreaterThan(60);
    expect(result.boundingBox!.maxX).toBeLessThan(180);
    expect(result.boundingBox!.maxY).toBeLessThan(180);
  });

  it('即時視訊拍攝 (sourceType: camera) 時，不執行第一步偵測印章裁切原圖流程，保留全幅畫面', async () => {
    // 建立 200x200 合成圖片，中央為紅色印章 (r: 35)
    const inputBuffer = await createSyntheticTestImage('red', 200, 200);

    const result = await stampExtractorService.extractStamp(inputBuffer, {
      colorMode: 'red',
      threshold: 35,
      sourceType: 'camera'
    });

    // 驗證：即時視訊拍攝不進行 Pass 1 裁切原圖，尺寸應完整保留原始視訊全幅 200x200
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
    expect(result.detectedColor).toBe('red');
  });

  it('選擇照片檔案 (sourceType: upload) 時，應執行第一步偵測印章流程後裁切原圖', async () => {
    // 建立 200x200 合成圖片，中央為紅色印章 (r: 35)
    const inputBuffer = await createSyntheticTestImage('red', 200, 200);

    const result = await stampExtractorService.extractStamp(inputBuffer, {
      colorMode: 'red',
      threshold: 35,
      autoCrop: true,
      sourceType: 'upload'
    });

    // 驗證：檔案上傳模式必須經過 Pass 1 偵測並裁切印章範圍，尺寸明顯縮減小於原圖 200
    expect(result.width).toBeLessThan(120);
    expect(result.height).toBeLessThan(120);
    expect(result.boundingBox).toBeDefined();
  });
});


