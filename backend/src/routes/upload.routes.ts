import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import uploadService from '../services/upload.service';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * Multer configuration — store file in memory so we get a Buffer via req.file.buffer.
 * A generous 10 MB hard cap is applied here; the actual per-purpose limits (5 MB for
 * expo_banner, 2 MB for company_logo) are enforced inside UploadService.uploadImage().
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB hard cap
});

const VALID_PURPOSES = ['expo_banner', 'company_logo'] as const;
type UploadPurpose = (typeof VALID_PURPOSES)[number];

/**
 * POST /api/upload/image
 *
 * Authenticated (any role). Accepts multipart/form-data with:
 *   - image   : file field  — the image to upload
 *   - purpose : string field — 'expo_banner' | 'company_logo'
 *
 * Delegates MIME inspection, size enforcement, and Cloudinary upload to UploadService.
 * Errors thrown by UploadService (UPLOAD_INVALID_TYPE, UPLOAD_TOO_LARGE, UPLOAD_FAILED)
 * carry .statusCode and .code and are forwarded to the global errorHandler via asyncHandler.
 *
 * Response 200:
 * {
 *   success: true,
 *   message: 'Image uploaded successfully',
 *   data: { url: string, publicId: string }
 * }
 */
router.post(
  '/image',
  authenticate,
  upload.single('image'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // 1. Validate file was included
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided. Include a file in the "image" field.',
        code: 'NO_FILE',
      });
      return;
    }

    // 2. Validate purpose field
    const purpose = req.body.purpose as string | undefined;

    if (!purpose || !(VALID_PURPOSES as readonly string[]).includes(purpose)) {
      res.status(400).json({
        success: false,
        message: `Invalid or missing "purpose". Must be one of: ${VALID_PURPOSES.join(', ')}.`,
        code: 'INVALID_PURPOSE',
      });
      return;
    }

    // 3. Delegate to UploadService (MIME check → size check → Cloudinary upload)
    const { url, publicId } = await uploadService.uploadImage(
      req.file.buffer,
      req.file.mimetype,
      req.file.size,
      purpose as UploadPurpose
    );

    // 4. Return success response
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully.',
      data: { url, publicId },
    });
  })
);

export default router;
