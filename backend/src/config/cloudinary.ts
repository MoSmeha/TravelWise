import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_API_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
}


export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1080, crop: 'limit' }, // Limit max width
        { quality: 'auto:good' }, // Auto quality
        { fetch_format: 'auto' }, // Auto format (webp, etc.)
      ],
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
      uploadOptions.overwrite = true;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            resource_type: result.resource_type,
          });
        } else {
          reject(new Error('Upload failed: no result returned'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}


export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
