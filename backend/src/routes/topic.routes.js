/**
 * STUDIA - Rutas de temas (/api/topics)
 * ------------------------------------------------------------------
 * Todas exigen autenticacion. El filtrado por dueño y el control de propiedad
 * (anti-IDOR) se aplican dentro del controlador, de modo que un estudiante
 * nunca puede leer ni modificar temas de otro.
 */

import { Router } from 'express';

import * as topicController from '../controllers/topic.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import {
  createTopicValidator,
  updateTopicValidator,
  topicIdParamValidator,
  listTopicsValidator,
} from '../validators/topic.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listTopicsValidator), topicController.listTopics);
router.post('/', validate(createTopicValidator), topicController.createTopic);
router.get('/:id', validate(topicIdParamValidator), topicController.getTopic);
router.put(
  '/:id',
  validate([...topicIdParamValidator, ...updateTopicValidator]),
  topicController.updateTopic
);
router.delete('/:id', validate(topicIdParamValidator), topicController.deleteTopic);

export default router;
