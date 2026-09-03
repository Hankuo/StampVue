import sharp from 'sharp';
import { StampExtractionOptions, StampExtractionResult, StampColorMode, BoundingBox } from '../types/stamp.types.js';

export class StampExtractorService {
  /**
   * 執行印章擷取與去背核心演算法
   */
  public async extractStamp(
    inputBuffer: Buffer,
    options: StampExtractionOptions = {}
  ): Promise<StampExtractionResult> {
    const {
      colorMode = 'auto',
      threshold = 38,
      shadowSuppression = 60,
      smoothness = 14,
      colorBoost = 25,
      autoCrop = true,
      padding = 16,
      sourceType = 'upload'
    } = options;

    const isCamera = sourceType === 'camera';

    // 1. 使用 sharp 載入圖片並轉換為標準 RGBA Raw Buffer
    const image = sharp(inputBuffer).rotate(); // 自動校正 EXIF 旋轉方向
    if (options.rotation) {
      image.rotate(options.rotation);
    }

    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (width === 0 || height === 0) {
      throw new Error('無法解析圖片尺寸或圖片格式不正確');
    }

    const { data: rawData } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 2. 若為 auto 模式，自動分析整張圖片判定為紅印還是藍印
    const resolvedColorMode = colorMode === 'auto' ? this.detectDominantStampColor(rawData, width, height) : colorMode;

    // -------------------------------------------------------------
    // Pass 1: 印章範圍定位 (選擇照片檔案時執行，即時視訊拍攝則跳過此流程保留全幅原圖)
    // -------------------------------------------------------------
    let pass1BoundingBox: BoundingBox | undefined = undefined;
    const totalPixels = width * height;
    const outputData = Buffer.from(rawData);
    const shadowGamma = 1.0 + (shadowSuppression / 100) * 1.5;
    const boostFactor = 1.0 + (colorBoost / 100) * 0.8;

    if (!isCamera) {
      const pass1ShadowSuppression = 40;
      const pass1Threshold = 70;
      const pass1ShadowGamma = 1.0 + (pass1ShadowSuppression / 100) * 1.5;
      const pass1TVal = (pass1Threshold / 100) * 120 + 10;
      const pass1SmoothRange = Math.max(1, (smoothness / 100) * 40);
      const pass1LowBound = Math.max(0, pass1TVal - pass1SmoothRange);

      const pass1RawData = Buffer.from(rawData);

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const r = pass1RawData[idx];
        const g = pass1RawData[idx + 1];
        const b = pass1RawData[idx + 2];
        const origAlpha = pass1RawData[idx + 3];

        if (origAlpha === 0) {
          pass1RawData[idx + 3] = 0;
          continue;
        }

        const maxNonTarget = resolvedColorMode === 'red' ? Math.max(g, b) : Math.max(r, g);
        const targetComp = resolvedColorMode === 'red' ? r : b;
        const diff = targetComp - maxNonTarget;

        if (diff <= 0) {
          pass1RawData[idx + 3] = 0;
          continue;
        }

        const maxRGB = Math.max(r, g, b);
        const luminanceFactor = Math.pow(Math.max(1, maxRGB) / 255.0, pass1ShadowGamma - 1.0);
        const score = (diff / (maxRGB + 15.0)) * 255.0 * luminanceFactor;

        if (score <= pass1LowBound) {
          pass1RawData[idx + 3] = 0;
        } else {
          pass1RawData[idx + 3] = 255;
        }
      }

      pass1BoundingBox = this.cleanNoiseAndGetBoundingBox(
        pass1RawData,
        width,
        height,
        padding
      );
    }

    // -------------------------------------------------------------
    // Pass 2: 執行去背 (全圖或依 Pass 1 裁切印章原圖位置)
    // -------------------------------------------------------------
    const pass2Threshold = threshold;
    const tVal = (pass2Threshold / 100) * 120 + 10;
    const smoothRange = Math.max(1, (smoothness / 100) * 40);
    const lowBound = Math.max(0, tVal - smoothRange);
    const highBound = tVal + smoothRange;

    const activeMinX = pass1BoundingBox ? pass1BoundingBox.minX : 0;
    const activeMinY = pass1BoundingBox ? pass1BoundingBox.minY : 0;
    const activeMaxX = pass1BoundingBox ? pass1BoundingBox.maxX : width - 1;
    const activeMaxY = pass1BoundingBox ? pass1BoundingBox.maxY : height - 1;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      const isYInside = y >= activeMinY && y <= activeMaxY;

      for (let x = 0; x < width; x++) {
        const i = rowOffset + x;
        const idx = i * 4;

        if (!isYInside || x < activeMinX || x > activeMaxX) {
          outputData[idx + 3] = 0;
          continue;
        }

        const r = rawData[idx];
        const g = rawData[idx + 1];
        const b = rawData[idx + 2];
        const origAlpha = rawData[idx + 3];

        if (origAlpha === 0) {
          outputData[idx + 3] = 0;
          continue;
        }

        const maxNonTarget = resolvedColorMode === 'red' ? Math.max(g, b) : Math.max(r, g);
        const targetComp = resolvedColorMode === 'red' ? r : b;
        const diff = targetComp - maxNonTarget;

        if (diff <= 0) {
          outputData[idx + 3] = 0;
          continue;
        }

        const maxRGB = Math.max(r, g, b);
        const luminanceFactor = Math.pow(Math.max(1, maxRGB) / 255.0, shadowGamma - 1.0);
        const score = (diff / (maxRGB + 15.0)) * 255.0 * luminanceFactor;

        let alpha = 0;
        if (score <= lowBound) {
          alpha = 0;
        } else if (score >= highBound) {
          alpha = 255;
        } else {
          const ratio = (score - lowBound) / (highBound - lowBound);
          const smoothRatio = ratio * ratio * (3 - 2 * ratio);
          alpha = Math.round(smoothRatio * 255);
        }

        if (alpha > 0) {
          if (resolvedColorMode === 'red') {
            outputData[idx] = Math.min(255, Math.round(r * boostFactor));
            outputData[idx + 1] = Math.max(0, Math.round(g * 0.7));
            outputData[idx + 2] = Math.max(0, Math.round(b * 0.7));
          } else {
            outputData[idx] = Math.max(0, Math.round(r * 0.7));
            outputData[idx + 1] = Math.max(0, Math.round(b * 0.8));
            outputData[idx + 2] = Math.min(255, Math.round(b * boostFactor));
          }
          outputData[idx + 3] = alpha;
        } else {
          outputData[idx + 3] = 0;
        }
      }
    }

    const boundingBox = pass1BoundingBox || {
      minX: 0,
      minY: 0,
      maxX: width - 1,
      maxY: height - 1,
      width,
      height
    };

    let finalWidth = width;
    let finalHeight = height;
    let finalImage = sharp(outputData, {
      raw: {
        width,
        height,
        channels: 4
      }
    });

    if (!isCamera && autoCrop && pass1BoundingBox) {
      finalImage = finalImage.extract({
        left: pass1BoundingBox.minX,
        top: pass1BoundingBox.minY,
        width: pass1BoundingBox.width,
        height: pass1BoundingBox.height
      });
      finalWidth = pass1BoundingBox.width;
      finalHeight = pass1BoundingBox.height;
    }

    const pngBuffer = await finalImage.png({ compressionLevel: 9 }).toBuffer();

    return {
      imageBuffer: pngBuffer,
      mimeType: 'image/png',
      width: finalWidth,
      height: finalHeight,
      detectedColor: resolvedColorMode,
      boundingBox
    };
  }

  /**
   * 智慧邊界雜訊過濾與主體印章 BoundingBox 分析
   */
  /**
   * 封閉印章邊緣與外框輪廓過濾演算法 (Enclosure Contour & Exterior Flood-Fill Eraser)
   */
  private cleanNoiseAndGetBoundingBox(
    rawData: Uint8Array | Buffer,
    width: number,
    height: number,
    padding: number
  ): BoundingBox | undefined {
    const GRID = 4;
    const cols = Math.ceil(width / GRID);
    const rows = Math.ceil(height / GRID);
    const totalCells = cols * rows;

    const gridCounts = new Int32Array(totalCells);
    let validPixels = 0;

    for (let y = 0; y < height; y++) {
      const gy = Math.floor(y / GRID);
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = (rowOffset + x) * 4;
        if (rawData[idx + 3] > 15) {
          validPixels++;
          const gx = Math.floor(x / GRID);
          gridCounts[gy * cols + gx]++;
        }
      }
    }

    if (validPixels === 0) return undefined;

    const gridOccupied = new Uint8Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      if (gridCounts[i] >= 2) {
        gridOccupied[i] = 1;
      }
    }

    const closedGrid = new Uint8Array(gridOccupied);
    for (let gy = 1; gy < rows - 1; gy++) {
      const rowIdx = gy * cols;
      for (let gx = 1; gx < cols - 1; gx++) {
        const idx = rowIdx + gx;
        if (closedGrid[idx] === 0) {
          const l = gridOccupied[idx - 1];
          const r = gridOccupied[idx + 1];
          const t = gridOccupied[idx - cols];
          const b = gridOccupied[idx + cols];
          if ((l && r) || (t && b)) {
            closedGrid[idx] = 1;
          }
        }
      }
    }

    // 4. 連通塊分析 (Connected Component Analysis)
    // 僅針對前景有效印章/雜訊網格 (closedGrid[i] === 1) 進行連通塊標記，避免背景空網格互相連通
    const visited = new Uint8Array(totalCells);
    interface Comp {
      cellIndices: number[];
      pixelCount: number;
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      centerX: number;
      centerY: number;
      touchesBorder: boolean;
    }
    const components: Comp[] = [];

    // 邊界防護帶 (網格距離邊界 4% 以內視為接觸相片邊界)
    const marginCols = Math.max(1, Math.floor(cols * 0.04));
    const marginRows = Math.max(1, Math.floor(rows * 0.04));

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const idx = gy * cols + gx;
        if (closedGrid[idx] === 1 && !visited[idx]) {
          const comp: Comp = {
            cellIndices: [],
            pixelCount: 0,
            minX: width,
            minY: height,
            maxX: 0,
            maxY: 0,
            centerX: 0,
            centerY: 0,
            touchesBorder: false
          };
          const q: number[] = [idx];
          visited[idx] = 1;

          while (q.length > 0) {
            const curr = q.pop()!;
            comp.cellIndices.push(curr);
            comp.pixelCount += gridCounts[curr];

            const cx = curr % cols;
            const cy = Math.floor(curr / cols);

            if (cx <= marginCols || cx >= cols - 1 - marginCols || cy <= marginRows || cy >= rows - 1 - marginRows) {
              comp.touchesBorder = true;
            }

            const x0 = cx * GRID;
            const y0 = cy * GRID;
            const x1 = Math.min(width - 1, x0 + GRID - 1);
            const y1 = Math.min(height - 1, y0 + GRID - 1);

            if (x0 < comp.minX) comp.minX = x0;
            if (x1 > comp.maxX) comp.maxX = x1;
            if (y0 < comp.minY) comp.minY = y0;
            if (y1 > comp.maxY) comp.maxY = y1;

            // 8-鄰域連通搜尋
            const nUp = cy > 0 ? (cy - 1) * cols + cx : -1;
            const nDown = cy < rows - 1 ? (cy + 1) * cols + cx : -1;
            const nLeft = cx > 0 ? cy * cols + (cx - 1) : -1;
            const nRight = cx < cols - 1 ? cy * cols + (cx + 1) : -1;
            const nUpLeft = cy > 0 && cx > 0 ? (cy - 1) * cols + (cx - 1) : -1;
            const nUpRight = cy > 0 && cx < cols - 1 ? (cy - 1) * cols + (cx + 1) : -1;
            const nDownLeft = cy < rows - 1 && cx > 0 ? (cy + 1) * cols + (cx - 1) : -1;
            const nDownRight = cy < rows - 1 && cx < cols - 1 ? (cy + 1) * cols + (cx + 1) : -1;

            const neighbors = [nUp, nDown, nLeft, nRight, nUpLeft, nUpRight, nDownLeft, nDownRight];
            for (const n of neighbors) {
              if (n >= 0 && closedGrid[n] === 1 && !visited[n]) {
                visited[n] = 1;
                q.push(n);
              }
            }
          }

          comp.centerX = (comp.minX + comp.maxX) / 2;
          comp.centerY = (comp.minY + comp.maxY) / 2;
          components.push(comp);
        }
      }
    }

    if (components.length === 0) return undefined;

    // 5. 區分內部獨立主體與外圍邊界雜訊
    const internalComps = components.filter(c => !c.touchesBorder);
    // 若有內部未接觸邊界的連通塊，優先從內部選取顯著印章主體；若無，退回全部連通塊（滿版印章）
    const candidateComps = internalComps.length > 0 ? internalComps : components;
    candidateComps.sort((a, b) => b.pixelCount - a.pixelCount);
    const mainStampComp = candidateComps[0];

    // 6. 印章群集擴展 (Single-Linkage Clustering)
    // 以主要印章為核心，自動吸收臨近的印章文字、邊框或字符連通塊，同時堅決排除遠處與邊界雜訊
    const cluster: Comp[] = [mainStampComp];
    let clusterMinX = mainStampComp.minX;
    let clusterMinY = mainStampComp.minY;
    let clusterMaxX = mainStampComp.maxX;
    let clusterMaxY = mainStampComp.maxY;

    let expanded = true;
    const remaining = candidateComps.filter(c => c !== mainStampComp);

    while (expanded) {
      expanded = false;
      const clusterWidth = clusterMaxX - clusterMinX;
      const clusterHeight = clusterMaxY - clusterMinY;
      const maxReach = Math.max(35, Math.max(clusterWidth, clusterHeight) * 0.6);

      for (let i = remaining.length - 1; i >= 0; i--) {
        const c = remaining[i];
        // 計算與當前印章群組外框的距離
        const dx = Math.max(0, clusterMinX - c.maxX, c.minX - clusterMaxX);
        const dy = Math.max(0, clusterMinY - c.maxY, c.minY - clusterMaxY);
        const dist = Math.hypot(dx, dy);

        if (dist <= maxReach) {
          cluster.push(c);
          clusterMinX = Math.min(clusterMinX, c.minX);
          clusterMinY = Math.min(clusterMinY, c.minY);
          clusterMaxX = Math.max(clusterMaxX, c.maxX);
          clusterMaxY = Math.max(clusterMaxY, c.maxY);
          remaining.splice(i, 1);
          expanded = true;
        }
      }
    }

    const validStampCells = new Set<number>();
    cluster.forEach(comp => {
      comp.cellIndices.forEach(cIdx => validStampCells.add(cIdx));
    });

    // 7. 過濾邊界雜訊像素並計算最終緊湊 BoundingBox
    let stampMinX = width;
    let stampMinY = height;
    let stampMaxX = 0;
    let stampMaxY = 0;
    let finalValidPixels = 0;

    for (let y = 0; y < height; y++) {
      const gy = Math.floor(y / GRID);
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = (rowOffset + x) * 4;
        if (rawData[idx + 3] > 0) {
          const gx = Math.floor(x / GRID);
          const cellIdx = gy * cols + gx;

          if (!validStampCells.has(cellIdx)) {
            rawData[idx + 3] = 0; // 徹底清除邊界雜訊或非印章像素
          } else {
            finalValidPixels++;
            if (x < stampMinX) stampMinX = x;
            if (x > stampMaxX) stampMaxX = x;
            if (y < stampMinY) stampMinY = y;
            if (y > stampMaxY) stampMaxY = y;
          }
        }
      }
    }

    if (finalValidPixels === 0 || stampMinX > stampMaxX || stampMinY > stampMaxY) return undefined;

    const cropMinX = Math.max(0, stampMinX - padding);
    const cropMinY = Math.max(0, stampMinY - padding);
    const cropMaxX = Math.min(width - 1, stampMaxX + padding);
    const cropMaxY = Math.min(height - 1, stampMaxY + padding);
    const cropWidth = Math.max(1, cropMaxX - cropMinX + 1);
    const cropHeight = Math.max(1, cropMaxY - cropMinY + 1);

    return {
      minX: cropMinX,
      minY: cropMinY,
      maxX: cropMaxX,
      maxY: cropMaxY,
      width: cropWidth,
      height: cropHeight
    };
  }

  /**
   * 自動偵測圖片中主導的印章顏色 (紅或藍)
   */
  private detectDominantStampColor(
    rawData: Uint8Array | Buffer,
    width: number,
    height: number
  ): 'red' | 'blue' {
    let redScoreTotal = 0;
    let blueScoreTotal = 0;
    const totalPixels = width * height;
    const step = Math.max(1, Math.floor(totalPixels / 20000)); // 快速採樣

    for (let i = 0; i < totalPixels; i += step) {
      const idx = i * 4;
      const r = rawData[idx];
      const g = rawData[idx + 1];
      const b = rawData[idx + 2];

      const redDiff = r - Math.max(g, b);
      if (redDiff > 25) {
        redScoreTotal += redDiff;
      }

      const blueDiff = b - Math.max(r, g);
      if (blueDiff > 25) {
        blueScoreTotal += blueDiff;
      }
    }

    return blueScoreTotal > redScoreTotal ? 'blue' : 'red';
  }
}

export const stampExtractorService = new StampExtractorService();
