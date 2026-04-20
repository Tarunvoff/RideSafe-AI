import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Request } from 'express';

const uploadRoot = join(process.cwd(), 'uploads', 'kyc');

const ensureUploadRoot = () => {
  if (!existsSync(uploadRoot)) {
    mkdirSync(uploadRoot, { recursive: true });
  }
};

const sanitizeType = (value: unknown) => {
  const normalized = String(value ?? 'document')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  return normalized || 'document';
};

@Controller('kyc/upload')
export class KycUploadController {
  @Post('document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadRoot();
          cb(null, uploadRoot);
        },
        filename: (req, file, cb) => {
          const type = sanitizeType((req.body as Record<string, unknown>)?.type);
          const extension = extname(file.originalname || '').toLowerCase() || '.jpg';
          cb(null, `${type}-${Date.now()}-${randomUUID()}${extension}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith('image/')) {
          return cb(new BadRequestException('Only image uploads are allowed'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  uploadDocument(@UploadedFile() file: any, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/kyc/${file.filename}`;

    return {
      message: 'Document uploaded successfully',
      fileUrl,
      filename: file.filename,
      contentType: file.mimetype,
      size: file.size,
    };
  }
}
