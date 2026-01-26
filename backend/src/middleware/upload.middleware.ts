import multer from 'multer';

const storage = multer.memoryStorage();


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

export const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});


export const singleImageUpload = uploadImage.single('image');


export const avatarUpload = uploadImage.single('avatar');
