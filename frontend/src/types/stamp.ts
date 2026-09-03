export type StampColorMode = 'red' | 'blue' | 'auto';
export type StampSourceType = 'camera' | 'upload';

export interface StampOptions {
  colorMode: StampColorMode;
  /** 去背門檻 (0 - 100, 預設 38) */
  threshold: number;
  /** 陰影抑制強度 (0 - 100, 預設 60) */
  shadowSuppression: number;
  /** 邊緣平滑羽化 (0 - 50, 預設 0) */
  smoothness: number;
  /** 墨色飽和度增益 (0 - 100, 預設 25) */
  colorBoost: number;
  /** 是否自動裁切空白邊界 */
  autoCrop: boolean;
  /** 裁切邊界 padding (px) */
  padding: number;
  /** 圖片旋轉角度 (0 - 360 度) */
  rotation: number;
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

export interface ProcessedStampResult {
  dataUrl: string;
  fullSizeDataUrl?: string;
  croppedOriginalDataUrl?: string;
  blob: Blob;
  width: number;
  height: number;
  detectedColor: 'red' | 'blue';
  processingTimeMs: number;
  boundingBox?: BoundingBox;
}

export type PreviewBackground = 'checkerboard' | 'white' | 'dark' | 'paper';
