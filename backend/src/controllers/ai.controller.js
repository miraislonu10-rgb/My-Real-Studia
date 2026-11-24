/**
 * STUDIA - Controlador de Inteligencia Artificial (AI Companion)
 * ------------------------------------------------------------------
 * Punto de entrada para las funciones del tutor pedagógico.
 */

import * as aiService from '../services/ai.service.js';
import { sendSuccess } from '../utils/respond.js';

/**
 * POST /api/ai/companion
 * Consulta al asistente pedagógico inteligente STUDIA AI Companion.
 */
export const consultCompanion = async (req, res, next) => {
  try {
    const { action, prompt, subjectName, topicName, exerciseText, userAnswer, correctAnswer } = req.body;

    const result = await aiService.queryAiCompanion(req.user.id, {
      action: action || 'general_help',
      prompt,
      subjectName,
      topicName,
      exerciseText,
      userAnswer,
      correctAnswer,
    });

    sendSuccess(res, {
      message: 'Respuesta de STUDIA AI Companion generada.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
