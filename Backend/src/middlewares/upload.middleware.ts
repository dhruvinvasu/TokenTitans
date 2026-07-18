import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import { Request } from 'express'
import multer, { FileFilterCallback } from 'multer'
import { Config } from '@/config/app.config'
import ValidationError from '@/errors/validation.error'

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
])

const uploadDir = path.resolve(process.cwd(), Config.UPLOAD_DIR)
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname)
    cb(null, `resume-${unique}${ext}`)
  },
})

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new ValidationError([
        { field: 'resume', message: 'Only PDF and DOCX files are allowed' },
      ]),
    )
  }
  cb(null, true)
}

export const resumeUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: Config.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
})
