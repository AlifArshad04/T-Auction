import { cloudinary } from '../config/cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
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
