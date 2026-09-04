import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env';

// Configure Cloudinary using validated env vars
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Size limits and folder mapping by upload purpose
 */
const PURPOSE_CONFIG = {
  expo_banner: {
    maxBytes: 5 * 1024 * 1024, // 5 MB
    folder: 'eventsphere/banners',
  },
  company_logo: {
    maxBytes: 2 * 1024 * 1024, // 2 MB
    folder: 'eventsphere/logos',
  },
  avatar: {
    maxBytes: 2 * 1024 * 1024, // 2 MB
    folder: 'eventsphere/avatars',
  },
} as const;

/**
 * Accepted MIME types
 */
const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

/**
 * Inspect the first bytes of a buffer to determine the actual image type.
 *
 * Magic bytes:
 *   PNG  — bytes 0–3: \x89 P N G  (\x89\x50\x4E\x47)
 *   JPEG — bytes 0–1: \xFF \xD8
 *   WebP — bytes 0–3: R I F F  AND bytes 8–11: W E B P
 *
 * Returns the detected MIME type, or null if the buffer doesn't match a
 * supported format.
 */
function detectMimeType(buffer: Buffer): AcceptedMimeType | null {
  if (buffer.length < 12) {
    return null;
  }

  // PNG: \x89 \x50 \x4E \x47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // JPEG: \xFF \xD8
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'image/jpeg';
  }

  // WebP: bytes 0–3 = "RIFF", bytes 8–11 = "WEBP"
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50   // P
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Create a custom error that matches the error handler format used in Phase 1.
 * The errorHandler middleware handles errors with a `statusCode` and optional `code`
 * property on the Error object.
 */
function createUploadError(message: string, code: string, statusCode: number): Error {
  const error: any = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

class UploadService {
  /**
   * Validate an image buffer and upload it to Cloudinary.
   *
   * Validation order (REQ-12.8):
   *   1. Magic-byte MIME inspection — rejects non-PNG/JPEG/WebP with UPLOAD_INVALID_TYPE
   *   2. Size check by purpose — rejects oversized files with UPLOAD_TOO_LARGE
   *   3. Cloudinary SDK upload to purpose-specific folder
   *
   * @param buffer    — Raw file bytes
   * @param mimeType  — MIME type reported by the client (used as a hint only; magic bytes are authoritative)
   * @param sizeBytes — Byte length of the buffer (used for the size limit check)
   * @param purpose   — Determines size limit and Cloudinary folder
   * @returns         — Cloudinary secure URL and public_id
   */
  async uploadImage(
    buffer: Buffer,
    _mimeType: string,
    sizeBytes: number,
    purpose: 'expo_banner' | 'company_logo' | 'avatar'
  ): Promise<{ url: string; publicId: string }> {
    // --- 9a: Magic-byte MIME validation ---
    const detectedMime = detectMimeType(buffer);

    if (detectedMime === null) {
      throw createUploadError(
        'Invalid file type. Only PNG, JPEG, and WebP images are accepted.',
        'UPLOAD_INVALID_TYPE',
        400
      );
    }

    // --- 9b: Size limit enforcement ---
    const config = PURPOSE_CONFIG[purpose];

    if (sizeBytes > config.maxBytes) {
      const limitMB = config.maxBytes / (1024 * 1024);
      throw createUploadError(
        `File too large. The maximum size for ${purpose} is ${limitMB} MB.`,
        'UPLOAD_TOO_LARGE',
        400
      );
    }

    // --- 9c: Cloudinary upload ---
    return this._uploadToCloudinary(buffer, detectedMime, config.folder);
  }

  /**
   * Upload a buffer to Cloudinary using upload_stream wrapped in a Promise.
   *
   * @param buffer   — Validated image buffer
   * @param mimeType — Confirmed MIME type from magic-byte inspection
   * @param folder   — Destination folder in Cloudinary
   */
  private _uploadToCloudinary(
    buffer: Buffer,
    _mimeType: AcceptedMimeType,
    folder: string
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(
              createUploadError(
                `Cloudinary upload failed: ${error.message}`,
                'UPLOAD_FAILED',
                502
              )
            );
            return;
          }

          if (!result) {
            reject(
              createUploadError(
                'Cloudinary upload returned no result.',
                'UPLOAD_FAILED',
                502
              )
            );
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }
}

export default new UploadService();
