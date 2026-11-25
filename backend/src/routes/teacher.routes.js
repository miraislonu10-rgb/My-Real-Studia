/**
 * STUDIA - Rutas de docencia (/api/teacher)
 * ------------------------------------------------------------------
 * Modulo de acompanamiento para administradores y tutores.
 *
 * IMPORTANTE: este router NO expone ninguna ruta de escritura. La vista de
 * docente es de solo lectura por diseno, de modo que quien la use no pueda
 * alterar los datos academicos de ningun estudiante.
 */

import { Router } from 'express';

import * as teacherController from '../controllers/teacher.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, requireTeacher } from '../middlewares/auth.js';
import { listStudentsValidator, studentUuidValidator } from '../validators/teacher.validators.js';

const router = Router();

// Exige sesion activa y rol docente (admin o tutor)
router.use(authenticate, requireTeacher);

// Solo lectura
router.get('/summary', teacherController.getSummary);
router.get('/students', validate(listStudentsValidator), teacherController.listStudents);
router.get('/students/:uuid', validate(studentUuidValidator), teacherController.getStudentDetail);

export default router;
