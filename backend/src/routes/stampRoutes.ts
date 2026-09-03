import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { stampExtractorService } from '../services/stampExtractor.js';
import { StampExtractionOptions, StampColorMode } from '../types/stamp.types.js';

const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB 限制
  }
});

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'StampVue Backend Service',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/stamp/extract
 * 支援 Multipart Form Data (file 欄位) 或 JSON Base64 (image 欄位)
 */
router.post(
  '/extract',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let imageBuffer: Buffer | null = null;

      if (req.file) {
        imageBuffer = req.file.buffer;
      } else if (req.body.image) {
        // Base64 string
        const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
      }

      if (!imageBuffer || imageBuffer.length === 0) {
        res.status(400).json({
          error: '請提供印章圖片 (支援 Multipart file 欄位或 JSON image Base64 字串)'
        });
        return;
      }

      const options: StampExtractionOptions = {
        colorMode: (req.body.colorMode as StampColorMode) || 'auto',
        threshold: req.body.threshold ? Number(req.body.threshold) : undefined,
        shadowSuppression: req.body.shadowSuppression ? Number(req.body.shadowSuppression) : undefined,
        smoothness: req.body.smoothness ? Number(req.body.smoothness) : undefined,
        colorBoost: req.body.colorBoost ? Number(req.body.colorBoost) : undefined,
        autoCrop: req.body.autoCrop !== undefined ? String(req.body.autoCrop) === 'true' : true,
        padding: req.body.padding ? Number(req.body.padding) : undefined
      };

      const result = await stampExtractorService.extractStamp(imageBuffer, options);

      // 若客戶端要求回傳二進位 PNG (例如 Accept: image/png 或 format=binary)
      if (req.query.format === 'binary' || req.headers.accept?.includes('image/png')) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'inline; filename="stamp_extracted.png"');
        res.send(result.imageBuffer);
        return;
      }

      // 預設返回 JSON 包含 Base64 與中繼資料
      res.json({
        success: true,
        detectedColor: result.detectedColor,
        width: result.width,
        height: result.height,
        boundingBox: result.boundingBox,
        image: `data:image/png;base64,${result.imageBuffer.toString('base64')}`
      });
    } catch (err: unknown) {
      next(err);
    }
  }
);

export default router;
