/**
 * STUDIA - Rutas de materias (/api/subjects)
 * ------------------------------------------------------------------
 * Todas exigen autenticacion. El filtrado por dueño y el control de propiedad
 * (anti-IDOR) se aplican dentro del controlador, de modo que un estudiante
 * nunca puede leer ni modificar materias de otro.
 */

import { Router } from 'express';

import * as subjectController from '../controllers/subject.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import {
  createSubjectValidator,
  updateSubjectValidator,
  subjectIdParamValidator,
  listSubjectsValidator,
} from '../validators/subject.validators.js';

const router = Router();

router.use(authenticate);

// Lista simple para selectores (debe ir antes de /:id)
router.get('/options', subjectController.listSubjectOptions);

router.get('/', validate(listSubjectsValidator), subjectController.listSubjects);
router.post('/', validate(createSubjectValidator), subjectController.createSubject);
router.get('/:id', validate(subjectIdParamValidator), subjectController.getSubject);
router.put(
  '/:id',
  validate([...subjectIdParamValidator, ...updateSubjectValidator]),
  subjectController.updateSubject
);
router.delete('/:id', validate(subjectIdParamValidator), subjectController.deleteSubject);

export default router;
