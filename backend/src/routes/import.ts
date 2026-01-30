import { Router, Request, Response } from 'express';
import { z } from 'zod';
import logger from '../logger.js';
import { authenticateToken } from '../middleware/auth.js';
import * as importService from '../services/importService.js';
import type { JwtPayload } from '../types/index.js';

const router = Router();

type AuthRequest = Request & { user: JwtPayload };

const uploadSchema = z.object({
  fileName: z.string().min(1),
  csvContent: z.string().min(1),
});

const mappingSchema = z.object({
  columnMapping: z.object({
    date: z.string().min(1),
    amount: z.string().min(1),
    description: z.string().min(1),
    category: z.string().optional(),
  }),
});

const updateRowSchema = z.object({
  rowIndex: z.number().int().min(0),
  updates: z.object({
    date: z.string().optional(),
    amount: z.number().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
  }),
});

const skipRowSchema = z.object({
  rowIndex: z.number().int().min(0),
  skip: z.boolean(),
});

router.use(authenticateToken);

// Get active session (for resume)
router.get('/session', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const session = await importService.getActiveSession(user.userId);

    if (!session) {
      res.status(404).json({ error: 'No active import session' });
      return;
    }

    // Include parsed rows if in preview status
    let parsedRows = null;
    if (session.status === 'preview' && session.parsedRows) {
      parsedRows = JSON.parse(session.parsedRows);
    }

    res.json({ session, parsedRows });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get active session');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new session
router.post('/session', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const session = await importService.createSession(user.userId);
    res.status(201).json({ session });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create session');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel session
router.delete('/session/:id', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const id = Number(req.params.id);

    const cancelled = await importService.cancelSession(id, user.userId);
    if (!cancelled) {
      res.status(404).json({ error: 'Session not found or already completed' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.id }, 'Failed to cancel session');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload CSV
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const data = uploadSchema.parse(req.body);

    const result = await importService.uploadCsv(
      user.userId,
      data.fileName,
      data.csvContent
    );

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({ errors: error.errors }, 'Upload validation failed');
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      logger.info({ message: error.message }, 'Upload failed');
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error({ err: error }, 'Failed to upload CSV');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save column mapping
router.post('/session/:id/mapping', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const sessionId = Number(req.params.id);
    const data = mappingSchema.parse(req.body);

    const result = await importService.saveMapping(
      sessionId,
      user.userId,
      data.columnMapping
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({ errors: error.errors }, 'Mapping validation failed');
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      if (error.message === 'Session not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      logger.info({ message: error.message }, 'Mapping failed');
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error({ err: error, sessionId: req.params.id }, 'Failed to save mapping');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a row's data
router.patch('/session/:id/row', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const sessionId = Number(req.params.id);
    const data = updateRowSchema.parse(req.body);

    const row = await importService.updateRow(
      sessionId,
      user.userId,
      data.rowIndex,
      data.updates
    );

    res.json({ row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({ errors: error.errors }, 'Row update validation failed');
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      if (error.message === 'Session not found' || error.message === 'Row not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      logger.info({ message: error.message }, 'Row update failed');
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error({ err: error, sessionId: req.params.id }, 'Failed to update row');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Skip/unskip a row
router.post('/session/:id/skip', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const sessionId = Number(req.params.id);
    const data = skipRowSchema.parse(req.body);

    const row = await importService.skipRow(
      sessionId,
      user.userId,
      data.rowIndex,
      data.skip
    );

    res.json({ row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({ errors: error.errors }, 'Skip row validation failed');
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      if (error.message === 'Session not found' || error.message === 'Row not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      logger.info({ message: error.message }, 'Skip row failed');
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error({ err: error, sessionId: req.params.id }, 'Failed to skip row');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm and execute import
router.post('/session/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const sessionId = Number(req.params.id);

    const result = await importService.confirmImport(sessionId, user.userId);

    logger.info(
      { userId: user.userId, sessionId, importedCount: result.importedCount },
      'Import confirmed'
    );

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Session not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      logger.info({ message: error.message }, 'Import confirmation failed');
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error({ err: error, sessionId: req.params.id }, 'Failed to confirm import');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List import history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const history = await importService.listImportHistory(user.userId);
    res.json(history);
  } catch (error) {
    logger.error({ err: error }, 'Failed to list import history');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
