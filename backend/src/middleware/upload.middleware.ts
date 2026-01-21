import multer from 'multer';

// Use memory storage - files will be available as buffers
// This is ideal for uploading to cloud services like Cloudinary
const storage = multer.memoryStorage();

// File filter to only allow images
const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error('Only image files are allowed (jpeg, png, gif, webp)'));
  }
};

// Create multer instance for single image upload
// Max file size: 10MB
export const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Middleware for single image upload with field name 'image'
export const singleImageUpload = uploadImage.single('image');

// Middleware for avatar upload with field name 'avatar'
export const avatarUpload = uploadImage.single('avatar');
