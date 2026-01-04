import { cloudinary } from '../config/cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

// Sanitize a string to be safe for Cloudinary public_id
export function sanitizePublicId(id: string): string {
  // Replace any non-alphanumeric characters (except - and _) with underscores
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function uploadImage(
  buffer: Buffer,
  folder: string,
  filename: string
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `t-auction/${folder}`,
        public_id: filename,
        overwrite: true,
        transformation: [
          { width: 500, height: 500, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else if (result) {
          resolve({
            success: true,
            url: result.secure_url,
            publicId: result.public_id
          });
        } else {
          resolve({ success: false, error: 'Unknown upload error' });
        }
      }
    );

    uploadStream.end(buffer);
  });
}

export async function uploadBase64Image(
  base64Data: string,
  folder: string,
  filename: string
): Promise<UploadResult> {
  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: `t-auction/${folder}`,
      public_id: filename,
      overwrite: true,
      transformation: [
        { width: 500, height: 500, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch {
    return false;
  }
}

export interface ImageCheckResult {
  exists: boolean;
  url?: string;
  publicId?: string;
}

// Check if an image exists in Cloudinary and return its URL
export async function checkImageExists(
  folder: string,
  filename: string
): Promise<ImageCheckResult> {
  const publicId = `t-auction/${folder}/${filename}`;
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      exists: true,
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch {
    return { exists: false };
  }
}

// Check multiple images in Cloudinary and return URLs for existing ones
export async function checkMultipleImagesExist(
  folder: string,
  filenames: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Use Promise.allSettled to check all images in parallel
  const checks = filenames.map(async (filename) => {
    const result = await checkImageExists(folder, filename);
    if (result.exists && result.url) {
      results.set(filename, result.url);
    }
  });

  await Promise.allSettled(checks);
  return results;
}
