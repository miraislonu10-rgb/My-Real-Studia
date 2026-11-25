/**
 * STUDIA - Controlador del plan de rescate (Study Rescue)
 * ------------------------------------------------------------------
 * `previewRescue` propone un plan (sin escribir nada) y `applyRescue` lo
 * persiste como tareas reales en `tasks` (Smart Planner).
 *
 * SEGURIDAD: la materia y el tema del plan se validan contra su propietario
 * (anti-IDOR) y cada tarea se crea siempre asociada al `user_id` de la sesion.
 */

import * as studyRescueModel from '../models/studyRescue.model.js';
import * as taskModel from '../models/task.model.js';
import * as subjectModel from '../models/subject.model.js';
import * as aiService from '../services/ai.service.js';
import { AppError } from '../utils/errors.js';
import { assertOwnership } from '../utils/ownership.js';
import { sendSuccess } from '../utils/respond.js';

/** Valida la materia (si se indica) y construye el plan sobre datos reales. */
const buildRescuePlan = async (req) => {
  const { subjectId, examDate, availableMinutesPerDay, maxTopics } = req.body;

  let subject = null;
  if (subjectId) {
    subject = await subjectModel.findById(subjectId);
    if (!subject) throw AppError.notFound('La materia indicada no existe.');
    assertOwnership(req.user, subject.userId, 'materia');
  }

  const plan = await studyRescueModel.buildPlan(req.user.id, {
    subjectId: subjectId ?? null,
    examDate,
    availableMinutesPerDay,
    maxTopics,
  });

  // Comentario pedagógico con IA (con respaldo local) sobre el plan ya calculado.
  if (plan.hasData) {
    plan.coach = await aiService.generateRescuePlan({ ...plan, subjectName: subject?.name || null });

    const byIndex = new Map((plan.coach.blocks || []).map((block) => [block.index, block]));
    plan.items = plan.items.map((item, index) => {
      const block = byIndex.get(index);
      return { ...item, focus: block?.focus || null, strategy: block?.strategy || null };
    });
  }

  return plan;
};

/**
 * POST /api/study-rescue/plan
 * Genera una propuesta de plan de rescate para preparar un examen.
 */
export const previewRescue = async (req, res, next) => {
  try {
    const plan = await buildRescuePlan(req);

    sendSuccess(res, {
      message: plan.hasData
        ? 'Plan de rescate generado.'
        : 'No hay temas debiles ni pendientes para rescatar en este momento.',
      data: { plan },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-rescue/apply
 * Crea las tareas del plan de rescate en el Smart Planner del estudiante.
 */
export const applyRescue = async (req, res, next) => {
  try {
    const plan = await buildRescuePlan(req);

    if (!plan.hasData) {
      throw AppError.badRequest(
        'No hay elementos que rescatar. Registra temas con bajo dominio, errores o tarjetas pendientes e inténtalo de nuevo.'
      );
    }

    const createdIds = [];
    for (const item of plan.items) {
      const id = await taskModel.create(req.user.id, {
        subjectId: item.subjectId ?? null,
        topicId: item.topicId ?? null,
        title: item.title,
        description: item.strategy ? `${item.description}\n\nEstrategia: ${item.strategy}` : item.description,
        dueDate: `${item.date} 23:59:59`,
        priority: item.priority,
        status: 'pending',
        goalPeriod: 'none',
        scheduledDate: item.date,
        estimatedMinutes: item.estimatedMinutes,
      });
      createdIds.push(id);
    }

    const tasks = (
      await Promise.all(createdIds.map((id) => taskModel.findById(id)))
    ).filter(Boolean);

    sendSuccess(res, {
      status: 201,
      message: `Se creó un plan de rescate con ${tasks.length} tarea(s) en tu Smart Planner.`,
      data: { tasks, plan },
    });
  } catch (error) {
    next(error);
  }
};
