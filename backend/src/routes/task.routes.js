/**
 * STUDIA - Rutas de tareas (/api/tasks)
 * ------------------------------------------------------------------
 * Todas exigen autenticacion. El filtrado por dueño y el control de propiedad
 * (anti-IDOR) se aplican dentro del controlador, de modo que un estudiante
 * nunca puede leer ni modificar tareas de otro.
 */

import { Router } from 'express';

import * as taskController from '../controllers/task.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import {
  createTaskValidator,
  updateTaskValidator,
  taskIdParamValidator,
  listTasksValidator,
} from '../validators/task.validators.js';

const router = Router();

router.use(authenticate);

// Resumen de tareas proximas (debe ir antes de /:id)
router.get('/meta/upcoming', taskController.listUpcomingTasks);

// Rutas de Smart Planner (deben ir antes de /:id)
router.get('/calendar', taskController.getCalendar);
router.get('/goals', taskController.getGoals);
router.get('/recommendations/reschedule', taskController.getRescheduleRecommendations);
router.post('/recommendations/apply', taskController.applyReschedule);

router.get('/', validate(listTasksValidator), taskController.listTasks);
router.post('/', validate(createTaskValidator), taskController.createTask);
router.get('/:id', validate(taskIdParamValidator), taskController.getTask);
router.put(
  '/:id',
  validate([...taskIdParamValidator, ...updateTaskValidator]),
  taskController.updateTask
);
router.patch('/:id/status', validate(taskIdParamValidator), taskController.updateTaskStatus);
router.delete('/:id', validate(taskIdParamValidator), taskController.deleteTask);

export default router;
