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

  it('應在含螢光增白劑之冷光白紙與陰影下成功擷取藍色印章，且背景徹底完全透明', async () => {
    const width = 200;
    const height = 200;
    const channels = 4;
    const data = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        // 模擬冷光白紙 (左上亮處 R:230, G:236, B:248；右下陰影處 R:140, G:150, B:172)
        const factor = (x + y) / (width + height); // 0 (亮) -> 1 (暗)
        let r = Math.round(230 - factor * 90);
        let g = Math.round(236 - factor * 86);
        let b = Math.round(248 - factor * 76); // B 明顯高於 R, G，模擬螢光增白劑與冷光源

        // 中央繪製真實藍色印章 (鮮藍原子印: R:35, G:75, B:220)
        const dist = Math.sqrt((x - 100) ** 2 + (y - 100) ** 2);
        if (dist < 35 && dist > 5) {
          r = 35;
          g = 75;
          b = 220;
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    const testImgBuffer = await sharp(data, { raw: { width, height, channels } }).png().toBuffer();

    // 測試藍印預設參數：陰影抑制 35%、去背強度 20%，冷光白紙背景徹底完全透明，筆劃飽滿完整
    const result = await stampExtractorService.extractStamp(testImgBuffer, {
      colorMode: 'blue',
      threshold: 20,
      shadowSuppression: 35,
      autoCrop: false
    });

    const { data: outRaw } = await sharp(result.imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 1. 印章圓心內部鏤空白紙 (x: 100, y: 100) 必須完全透明 (Alpha = 0)
    const centerPaperAlpha = outRaw[(100 * 200 + 100) * 4 + 3];
    expect(centerPaperAlpha).toBe(0);

    // 2. 印章外圍相鄰白紙 (x: 100, y: 145, 半徑外 dist=45) 必須完全透明 (Alpha = 0)
    const adjacentPaperAlpha = outRaw[(145 * 200 + 100) * 4 + 3];
    expect(adjacentPaperAlpha).toBe(0);

    // 3. 中央藍色印章筆劃主體 (x: 100, y: 80) 必須清晰保留 (Alpha > 200)
    const stampAlpha = outRaw[(80 * 200 + 100) * 4 + 3];
    expect(stampAlpha).toBeGreaterThan(200);
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

  it('應成功高精度去背真實青藍色印章，徹底濾除黑字與陰影，且維持純淨自然之藍色墨水色彩', async () => {
    const width = 200;
    const height = 200;
    const channels = 4;
    const data = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        // 模擬黃白底紙與斜向陰影
        const shadow = Math.max(90, 240 - ((x + y) / 400) * 140);
        let r = shadow;
        let g = Math.max(0, shadow - 5);
        let b = Math.max(0, shadow - 15); // 微暖偏黃

        // 模擬黑字印刷文字 (x: 40~60, y: 40~45)
        if (x >= 40 && x <= 60 && y >= 40 && y <= 45) {
          r = 30;
          g = 30;
          b = 30;
        }

        // 模擬中央真實青藍色/海軍藍印章 (cx: 100, cy: 100, 半徑 25)
        const dist = Math.hypot(x - 100, y - 100);
        if (dist >= 15 && dist <= 28) {
          // 青藍色印泥：R=45, G=110, B=195
          r = 45;
          g = 110;
          b = 195;
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    const inputPng = await sharp(data, { raw: { width, height, channels } }).png().toBuffer();
    const result = await stampExtractorService.extractStamp(inputPng, {
      colorMode: 'blue',
      threshold: 40,
      shadowSuppression: 45,
      autoCrop: false
    });

    expect(result.detectedColor).toBe('blue');

    const { data: outRaw } = await sharp(result.imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 1. 印章圓環處應完整保留，且 Alpha 高
    const stampIdx = (100 * 200 + 120) * 4; // dist = 20
    expect(outRaw[stampIdx + 3]).toBeGreaterThan(200);

    // 2. 驗證色彩純淨度：綠色通道不可因 b*0.8 被污染至青色 (G 應被壓制 <= 90，B 應維持 >= 195)
    expect(outRaw[stampIdx + 1]).toBeLessThanOrEqual(95);
    expect(outRaw[stampIdx + 2]).toBeGreaterThanOrEqual(190);

    // 3. 黑字區域應徹底濾除為透明
    const blackTextIdx = (42 * 200 + 50) * 4;
    expect(outRaw[blackTextIdx + 3]).toBe(0);

    // 4. 陰影區域應徹底濾除為透明
    const shadowIdx = (180 * 200 + 180) * 4;
    expect(outRaw[shadowIdx + 3]).toBe(0);
  });

  it('陰影抑制參數應具備顯著調節效果：當存在暗部色偏雜訊時，提升 shadowSuppression 能徹底濾除陰影，而低抑制時保留暗處細節', async () => {
    const width = 100;
    const height = 100;
    const channels = 4;
    const data = Buffer.alloc(width * height * channels);

    // 建立微暖環境反射暗部陰影底紙 (R:140, G:120, B:110，帶有自然色偏)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        // 左半部為帶有色偏之深色紙張陰影，右半部為深部紅印章筆劃
        if (x < 50) {
          data[idx] = 140;
          data[idx + 1] = 120;
          data[idx + 2] = 110;
        } else {
          data[idx] = 135;
          data[idx + 1] = 30;
          data[idx + 2] = 30;
        }
        data[idx + 3] = 255;
      }
    }

    const testImg = await sharp(data, { raw: { width, height, channels } }).png().toBuffer();

    // 測試 A：當 shadowSuppression = 0% 時，陰影抑制未開啟，暗部雜訊在較低門檻下會被保留
    const resultNoSupp = await stampExtractorService.extractStamp(testImg, {
      colorMode: 'red',
      threshold: 15,
      shadowSuppression: 0,
      sourceType: 'camera',
      autoCrop: false
    });
    const { data: rawNoSupp } = await sharp(resultNoSupp.imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const shadowAlphaNoSupp = rawNoSupp[(20 * 100 + 20) * 4 + 3];
    expect(shadowAlphaNoSupp).toBeGreaterThan(0); // 陰影未被抑制

    // 測試 B：當 shadowSuppression = 50% 時，動態陰影底限啟動，暗部微弱偏色陰影徹底完全濾除為透明 (Alpha = 0)
    const resultSupp = await stampExtractorService.extractStamp(testImg, {
      colorMode: 'red',
      threshold: 15,
      shadowSuppression: 50,
      sourceType: 'camera',
      autoCrop: false
    });
    const { data: rawSupp } = await sharp(resultSupp.imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const shadowAlphaSupp = rawSupp[(20 * 100 + 20) * 4 + 3];
    expect(shadowAlphaSupp).toBe(0); // 陰影徹底濾除

    // 驗證右側深部印章主體依然完整保留
    const stampAlphaSupp = rawSupp[(20 * 100 + 75) * 4 + 3];
    expect(stampAlphaSupp).toBeGreaterThan(200);
  });
});



