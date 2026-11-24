/**
 * STUDIA - Rutas de tarjetas de memoria (/api/flashcards)
 * ------------------------------------------------------------------
 * Requieren autenticación y verifican la propiedad de cada recurso.
 */

import { Router } from 'express';
import * as flashcardController from '../controllers/flashcard.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import {
  createFlashcardValidator,
  updateFlashcardValidator,
  reviewFlashcardValidator,
  flashcardIdParamValidator,
  listFlashcardsValidator,
} from '../validators/flashcard.validators.js';

const router = Router();

router.use(authenticate);

// Métricas y tarjetas pendientes (deben ir antes de /:id)
router.get('/pending', flashcardController.getPendingFlashcards);
router.get('/history', flashcardController.getReviewHistory);
router.get('/stats', flashcardController.getFlashcardStats);

router.get('/', validate(listFlashcardsValidator), flashcardController.listFlashcards);
router.post('/', validate(createFlashcardValidator), flashcardController.createFlashcard);
router.get('/:id', validate(flashcardIdParamValidator), flashcardController.getFlashcard);
router.put(
  '/:id',
  validate([...flashcardIdParamValidator, ...updateFlashcardValidator]),
  flashcardController.updateFlashcard
);
router.post(
  '/:id/review',
  validate([...flashcardIdParamValidator, ...reviewFlashcardValidator]),
  flashcardController.reviewFlashcard
);
router.delete('/:id', validate(flashcardIdParamValidator), flashcardController.deleteFlashcard);

export default router;
