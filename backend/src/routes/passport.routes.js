/**
 * STUDIA - Rutas del pasaporte academico (/api/passport)
 * ------------------------------------------------------------------
 * Requieren autenticacion. Las entradas se comprueban contra su propietario.
 */

import { Router } from 'express';
import * as passportController from '../controllers/passport.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import {
  createEntryValidator,
  updateEntryValidator,
  entryIdParamValidator,
} from '../validators/passport.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', passportController.getPassport);

router.post('/entries', validate(createEntryValidator), passportController.createEntry);
router.put('/entries/:id', validate(updateEntryValidator), passportController.updateEntry);
router.delete('/entries/:id', validate(entryIdParamValidator), passportController.deleteEntry);

export default router;
