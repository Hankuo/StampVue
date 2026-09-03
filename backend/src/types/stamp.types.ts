export type StampColorMode = 'red' | 'blue' | 'auto';
export type StampSourceType = 'camera' | 'upload';

export interface StampExtractionOptions {
  colorMode?: StampColorMode;
  /** 去背門檻 (0 - 100, 預設 40) */
  threshold?: number;
  /** 陰影抑制強度 (0 - 100, 預設 65) */
  shadowSuppression?: number;
  /** 邊緣平滑羽化度 (0 - 50, 預設 15) */
  smoothness?: number;
  /** 墨色飽和度增益 (0 - 100, 預設 25) */
  colorBoost?: number;
  /** 是否自動裁切至印章最小邊界 (預設 true) */
  autoCrop?: boolean;
  /** 自動裁切邊界保留寬度 (px, 預設 16) */
  padding?: number;
  /** 圖片旋轉角度 (0 - 360 度) */
  rotation?: number;
  /** 影像來源：'camera' (即時視訊拍攝，不執行 Pass 1 偵測裁切) | 'upload' (選擇照片檔案，執行 Pass 1 偵測裁切原圖) */
  sourceType?: StampSourceType;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface StampExtractionResult {
  imageBuffer: Buffer;
  mimeType: 'image/png';
  width: number;
  height: number;
  detectedColor: 'red' | 'blue';
  boundingBox?: BoundingBox;
}
