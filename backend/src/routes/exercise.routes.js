/**
 * STUDIA - Rutas de ejercicios de practica (/api/exercises)
 * ------------------------------------------------------------------
 * Todas exigen autenticacion. El filtrado por dueño y el control de propiedad
 * (anti-IDOR) se aplican dentro del controlador, de modo que un estudiante
 * nunca puede leer ni modificar ejercicios de otro.
 */

import { Router } from 'express';

import * as exerciseController from '../controllers/exercise.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import {
  createExerciseValidator,
  updateExerciseValidator,
  exerciseIdParamValidator,
  listExercisesValidator,
} from '../validators/exercise.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listExercisesValidator), exerciseController.listExercises);
router.post('/', validate(createExerciseValidator), exerciseController.createExercise);
router.get('/:id', validate(exerciseIdParamValidator), exerciseController.getExercise);
router.put(
  '/:id',
  validate([...exerciseIdParamValidator, ...updateExerciseValidator]),
  exerciseController.updateExercise
);
router.delete('/:id', validate(exerciseIdParamValidator), exerciseController.deleteExercise);

export default router;
