const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Tipuri de fisiere acceptate pentru documente de mentenanta
// (certificate, rapoarte de service, poze ale interventiei)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
];

function getUploadRoot() {
  // Fallback la un folder local doar daca UPLOAD_DIR nu e setat (nerecomandat in productie -
  // vezi nota din .env.example despre pastrarea fisierelor in afara folderului proiectului)
  const root = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  return root;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const root = getUploadRoot();
    // Sub-folder pe zi, ca sa nu se acumuleze mii de fisiere intr-un singur director
    const subDir = new Date().toISOString().slice(0, 7); // ex: 2026-08
    const fullDir = path.join(root, subDir);
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }
    // Salvam subdirectorul folosit pe request, ca sa-l putem reconstitui in controller
    req._uploadSubDir = subDir;
    cb(null, fullDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Tip de fisier neacceptat: ${file.mimetype}. Sunt acceptate: PDF, Word, Excel, JPG, PNG, WEBP.`));
  }
  cb(null, true);
}

const maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_MB || 15) * 1024 * 1024;

const uploadMaintenanceDocs = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSizeBytes, files: 10 },
});

module.exports = { uploadMaintenanceDocs, getUploadRoot };
