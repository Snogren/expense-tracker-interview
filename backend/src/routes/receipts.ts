import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import logger from '../logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { analyzeEmailForReceipt, analyzePdfForReceipt } from '../services/llmService.js';
import db from '../db/knex.js';
import type { Category } from '../types/index.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

const analyzeEmailSchema = z.object({
  emailContent: z.string().min(1).max(50000),
});

router.use(authenticateToken);

async function matchCategory(suggestedCategory: string) {
  const categories = await db('categories').select<Category[]>('*');

  let matchedCategory = categories.find(
    (c) => c.name.toLowerCase() === suggestedCategory.toLowerCase()
  );

  if (!matchedCategory) {
    matchedCategory = categories.find((c) => c.name.toLowerCase() === 'other') || categories[0];
  }

  return matchedCategory;
}

router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { emailContent } = analyzeEmailSchema.parse(req.body);

    const result = await analyzeEmailForReceipt(emailContent);

    if (!result.isReceipt || !result.data) {
      res.json({ isReceipt: false, data: null });
      return;
    }

    const matchedCategory = await matchCategory(result.data.category);

    res.json({
      isReceipt: true,
      data: {
        ...result.data,
        categoryId: matchedCategory?.id,
        categoryName: matchedCategory?.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({ errors: error.errors }, 'Receipt analysis validation failed');
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    logger.error({ err: error }, 'Failed to analyze receipt');
    res.status(500).json({ error: 'Failed to analyze email content' });
  }
});

router.post('/analyze-pdf', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No PDF file uploaded' });
      return;
    }

    const result = await analyzePdfForReceipt(req.file.buffer);

    if (!result.isReceipt || !result.data) {
      res.json({ isReceipt: false, data: null });
      return;
    }

    const matchedCategory = await matchCategory(result.data.category);

    res.json({
      isReceipt: true,
      data: {
        ...result.data,
        categoryId: matchedCategory?.id,
        categoryName: matchedCategory?.name,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to analyze PDF receipt');
    res.status(500).json({ error: 'Failed to analyze PDF content' });
  }
});

export default router;
