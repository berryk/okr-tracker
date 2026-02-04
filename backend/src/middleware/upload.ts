import multer from 'multer';
import { Request } from 'express';

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .pptx files are accepted.'));
  }
};

export const pptxUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

export default pptxUpload;
