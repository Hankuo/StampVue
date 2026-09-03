import { StampOptions, ProcessedStampResult, BoundingBox } from '../types/stamp';

export class StampProcessor {
  /**
   * 在客戶端使用 Canvas 執行即時印章去背與陰影濾除 (5~20ms)
   */
  public static async processImage(
    imageSource: HTMLImageElement | HTMLCanvasElement,
    options: StampOptions
  ): Promise<ProcessedStampResult> {
    const startTime = performance.now();

    const rawWidth = imageSource.width;
    const rawHeight = imageSource.height;

    // -------------------------------------------------------------
    // 0. 畫布旋轉處理 (Rotation: 0° - 360°)
    // -------------------------------------------------------------
    const rotationRad = (((options.rotation || 0) % 360) * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rotationRad));
    const sin = Math.abs(Math.sin(rotationRad));

    const rotWidth = Math.round(rawWidth * cos + rawHeight * sin);
    const rotHeight = Math.round(rawWidth * sin + rawHeight * cos);

    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = rotWidth;
    rotCanvas.height = rotHeight;
    const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
    if (!rotCtx) throw new Error('無法初始化 Canvas 2D 繪圖環境');

    rotCtx.translate(rotWidth / 2, rotHeight / 2);
    rotCtx.rotate(rotationRad);
    rotCtx.drawImage(imageSource, -rawWidth / 2, -rawHeight / 2);

    const rotImgData = rotCtx.getImageData(0, 0, rotWidth, rotHeight);
    const rotRawData = rotImgData.data;
    const rotTotalPixels = rotWidth * rotHeight;

    // 1. 自動色彩判定
    const resolvedColor =
      options.colorMode === 'auto'
        ? this.detectDominantColor(rotRawData, rotWidth, rotHeight)
        : options.colorMode;

    const isCamera = options.sourceType === 'camera';

    // -------------------------------------------------------------
    // Pass 1: 印章範圍定位與雜訊過濾 (選擇照片檔案時執行，即時視訊拍攝則跳過此流程保留全幅原圖)
    // -------------------------------------------------------------
    let pass1BoundingBox: BoundingBox | undefined = undefined;

    if (!isCamera) {
      const pass1ShadowSuppression = 40;
      const pass1Threshold = 70;
      const pass1ShadowGamma = 1.0 + (pass1ShadowSuppression / 100) * 1.5;
      const pass1TVal = (pass1Threshold / 100) * 120 + 10;
      const pass1SmoothRange = Math.max(1, (options.smoothness / 100) * 40);
      const pass1LowBound = Math.max(0, pass1TVal - pass1SmoothRange);

      const pass1RawData = new Uint8Array(rotRawData);

      for (let i = 0; i < rotTotalPixels; i++) {
        const idx = i * 4;
        const r = pass1RawData[idx];
        const g = pass1RawData[idx + 1];
        const b = pass1RawData[idx + 2];
        const origAlpha = pass1RawData[idx + 3];

        if (origAlpha === 0) {
          pass1RawData[idx + 3] = 0;
          continue;
        }

        const maxNonTarget = resolvedColor === 'red' ? Math.max(g, b) : Math.max(r, g);
        const targetComp = resolvedColor === 'red' ? r : b;
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

      // 依據 Pass 1 與連通分量群集分析找到主體印章 BoundingBox
      pass1BoundingBox = this.cleanNoiseAndGetBoundingBox(
        pass1RawData,
        rotWidth,
        rotHeight,
        options.padding
      );
    }

    // 決定算繪基底區域 (即時拍攝全幅 vs 照片檔案裁切)
    const boundingBox = (!isCamera && pass1BoundingBox) ? pass1BoundingBox : {
      minX: 0,
      minY: 0,
      maxX: rotWidth - 1,
      maxY: rotHeight - 1,
      width: rotWidth,
      height: rotHeight
    };

    // -------------------------------------------------------------
    // 2. 建立算繪畫布 (即時拍攝保留全幅原圖，檔案上傳裁切印章特寫)
    // -------------------------------------------------------------
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = boundingBox.width;
    cropCanvas.height = boundingBox.height;
    const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
    if (!cropCtx) throw new Error('無法初始化 2D Crop Canvas');

    cropCtx.drawImage(
      rotCanvas,
      boundingBox.minX,
      boundingBox.minY,
      boundingBox.width,
      boundingBox.height,
      0,
      0,
      boundingBox.width,
      boundingBox.height
    );

    const croppedOriginalDataUrl = cropCanvas.toDataURL('image/png');

    // -------------------------------------------------------------
    // Pass 2: 執行精細去背運算
    // -------------------------------------------------------------
    const cropImgData = cropCtx.getImageData(0, 0, boundingBox.width, boundingBox.height);
    const cropRawData = cropImgData.data;
    const cropTotalPixels = boundingBox.width * boundingBox.height;

    const shadowGamma = 1.0 + (options.shadowSuppression / 100) * 1.5;
    const boostFactor = 1.0 + (options.colorBoost / 100) * 0.8;
    const pass2Threshold = options.threshold; // 精細去背門檻 (預設 50%)
    const tVal = (pass2Threshold / 100) * 120 + 10;
    const smoothRange = Math.max(1, (options.smoothness / 100) * 40);
    const lowBound = Math.max(0, tVal - smoothRange);
    const highBound = tVal + smoothRange;

    for (let i = 0; i < cropTotalPixels; i++) {
      const idx = i * 4;
      const r = cropRawData[idx];
      const g = cropRawData[idx + 1];
      const b = cropRawData[idx + 2];
      const origAlpha = cropRawData[idx + 3];

      if (origAlpha === 0) {
        cropRawData[idx + 3] = 0;
        continue;
      }

      const maxNonTarget = resolvedColor === 'red' ? Math.max(g, b) : Math.max(r, g);
      const targetComp = resolvedColor === 'red' ? r : b;
      const diff = targetComp - maxNonTarget;

      if (diff <= 0) {
        cropRawData[idx + 3] = 0;
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
        if (resolvedColor === 'red') {
          cropRawData[idx] = Math.min(255, Math.round(r * boostFactor));
          cropRawData[idx + 1] = Math.max(0, Math.round(g * 0.7));
          cropRawData[idx + 2] = Math.max(0, Math.round(b * 0.7));
        } else {
          cropRawData[idx] = Math.max(0, Math.round(r * 0.7));
          cropRawData[idx + 1] = Math.max(0, Math.round(b * 0.8));
          cropRawData[idx + 2] = Math.min(255, Math.round(b * boostFactor));
        }
        cropRawData[idx + 3] = alpha;
      } else {
        cropRawData[idx + 3] = 0;
      }
    }

    cropCtx.putImageData(cropImgData, 0, 0);

    // 建立與全圖尺寸相同之全透明 Canvas，置入去背印章 (用於 Split View 視圖全圖對比對齊)
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = rotWidth;
    fullCanvas.height = rotHeight;
    const fullCtx = fullCanvas.getContext('2d');
    if (fullCtx) {
      fullCtx.drawImage(cropCanvas, boundingBox.minX, boundingBox.minY);
    }
    const fullSizeDataUrl = fullCanvas.toDataURL('image/png');

    // 產出純印章大小透明 PNG
    const dataUrl = cropCanvas.toDataURL('image/png');
    const blob = await new Promise<Blob>((resolve) => {
      cropCanvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
    });

    const endTime = performance.now();

    return {
      dataUrl,
      fullSizeDataUrl,
      croppedOriginalDataUrl,
      blob,
      width: boundingBox.width,
      height: boundingBox.height,
      detectedColor: resolvedColor,
      processingTimeMs: Math.round(endTime - startTime),
      boundingBox
    };
  }

  /**
   * 智慧邊界雜訊過濾與主體印章 BoundingBox 分析
   * 1. 劃分 16x16 網格計算印章像素密度。
   * 2. 使用 BFS 尋找連通分量，找出最大主體印章 Cluster。
   * 3. 抹除孤立邊界彩帶與無關雜訊點 (Alpha 設為 0)。
   * 4. 計算極度精確之主體印章 BoundingBox。
   */
  /**
   * 封閉印章邊緣與外框輪廓過濾演算法 (Enclosure Contour & Exterior Flood-Fill Eraser)
   * 1. 使用 4x4 像素網格二值化印章圖樣與邊框。
   * 2. 進行形態學閉合，自動補全印章邊框筆劃之微小缺口。
   * 3. 由圖像四個最外緣發起廣度優先水淹標記 (BFS Flood-Fill)，標記所有外部背景區域。
   * 4. 判定受封閉外框保護的主體印章區域，凡屬於外部背景區或外圍非連通條紋，Alpha 100% 抹除！
   * 5. 精確計算主體印章外框 BoundingBox。
   */
  private static cleanNoiseAndGetBoundingBox(
    rawData: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    padding: number
  ): BoundingBox | undefined {
    const GRID = 4; // 4x4 高精細網格
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

    // 網格二值化 (4x4 內有 >= 2 個印章像素視為印章實體)
    const gridOccupied = new Uint8Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      if (gridCounts[i] >= 2) {
        gridOccupied[i] = 1;
      }
    }

    // 形態學閉合 (Morphological Closing): 閉合 1~2 格 (4~8px) 微小缺口
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
   * 自動偵測色彩
   */
  private static detectDominantColor(
    rawData: Uint8ClampedArray,
    width: number,
    height: number
  ): 'red' | 'blue' {
    let redScore = 0;
    let blueScore = 0;
    const totalPixels = width * height;
    const step = Math.max(1, Math.floor(totalPixels / 15000));

    for (let i = 0; i < totalPixels; i += step) {
      const idx = i * 4;
      const r = rawData[idx];
      const g = rawData[idx + 1];
      const b = rawData[idx + 2];

      const rDiff = r - Math.max(g, b);
      if (rDiff > 25) redScore += rDiff;

      const bDiff = b - Math.max(r, g);
      if (bDiff > 25) blueScore += bDiff;
    }

    return blueScore > redScore ? 'blue' : 'red';
  }

  /**
   * 建立極具真實感之測試印章圖（包含紙張紋理、字體細節與斜向手機陰影）
   */
  public static generateRealisticSample(type: 'red_shadow' | 'blue_contract' | 'circle_seal'): string {
    const width = 600;
    const height = 600;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. 繪製微黃白紙底色與紙張雜訊
    ctx.fillStyle = '#fbf9f4';
    ctx.fillRect(0, 0, width, height);

    // 2. 模擬合約底稿灰黑文字
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    for (let y = 80; y < height; y += 36) {
      ctx.fillText('甲方與乙方就本專案之交付標準與驗收作業規範達成合意條款...', 40, y);
    }

    // 3. 繪製斜向深灰色手機陰影
    const shadowGrad = ctx.createLinearGradient(0, 0, width, height);
    shadowGrad.addColorStop(0, 'rgba(30, 41, 59, 0.05)');
    shadowGrad.addColorStop(0.4, 'rgba(15, 23, 42, 0.25)');
    shadowGrad.addColorStop(0.7, 'rgba(15, 23, 42, 0.65)'); // 深手機陰影
    shadowGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0.15)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, width, height);

    // 4. 繪製印章
    const centerX = width / 2 + 30;
    const centerY = height / 2 + 20;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-0.06); // 微微傾斜

    if (type === 'red_shadow' || type === 'circle_seal') {
      // 紅色古典圓形公司公章 / 官印
      const isSquare = type === 'red_shadow';
      const inkColor = 'rgba(215, 38, 56, 0.88)';
      ctx.strokeStyle = inkColor;
      ctx.fillStyle = inkColor;
      ctx.lineWidth = 5;

      if (isSquare) {
        // 方形印
        ctx.strokeRect(-90, -90, 180, 180);
        ctx.lineWidth = 2;
        ctx.strokeRect(-83, -83, 166, 166);

        ctx.font = 'bold 32px "Noto Serif TC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('科技創新', -35, -35);
        ctx.fillText('軟體研發', 35, -35);
        ctx.fillText('專案驗收', -35, 35);
        ctx.fillText('專用印章', 35, 35);
      } else {
        // 圓形章
        ctx.beginPath();
        ctx.arc(0, 0, 95, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 88, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 36px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', 0, -35);
        ctx.font = 'bold 26px "Noto Serif TC", serif';
        ctx.fillText('智 慧 審 核', 0, 15);
        ctx.font = '16px serif';
        ctx.fillText('APPROVED', 0, 48);
      }
    } else {
      // 藍色橢圓合約簽署章
      const inkColor = 'rgba(29, 78, 216, 0.86)';
      ctx.strokeStyle = inkColor;
      ctx.fillStyle = inkColor;
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.ellipse(0, 0, 120, 75, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, 0, 112, 67, 0, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 24px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CONTRACT SIGNED', 0, -20);
      ctx.font = '18px "Noto Sans TC", sans-serif';
      ctx.fillText('合約確認章', 0, 15);
      ctx.font = '12px monospace';
      ctx.fillText('2026-09-02 VERIFIED', 0, 42);
    }

    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.92);
  }
}
