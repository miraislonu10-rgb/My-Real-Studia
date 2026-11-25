/**
 * STUDIA - Controlador de Inteligencia Artificial (AI Companion)
 * ------------------------------------------------------------------
 * Punto de entrada para las funciones del tutor pedagógico.
 */

import * as aiService from '../services/ai.service.js';
import * as subjectModel from '../models/subject.model.js';
import * as topicModel from '../models/topic.model.js';
import * as exerciseModel from '../models/exercise.model.js';
import { AppError } from '../utils/errors.js';
import { assertOwnership } from '../utils/ownership.js';
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

/**
 * POST /api/ai/note-to-quiz
 * Convierte los apuntes del estudiante en preguntas y las guarda como
 * ejercicios reales ligados a una materia (y, opcionalmente, a un tema).
 * La materia y el tema deben pertenecer al solicitante (anti-IDOR).
 */
export const noteToQuiz = async (req, res, next) => {
  try {
    const { notes, subjectId, topicId, subjectName, topicName, questionCount, difficultyLevel } =
      req.body;

    const subject = await subjectModel.findById(subjectId);
    if (!subject) throw AppError.notFound('La materia indicada no existe.');
    assertOwnership(req.user, subject.userId, 'materia');

    if (topicId) {
      const topic = await topicModel.findById(topicId);
      if (!topic) throw AppError.notFound('El tema indicado no existe.');
      assertOwnership(req.user, topic.userId, 'tema');
    }

    const generation = await aiService.generateQuizFromNotes(req.user.id, {
      notes,
      subjectName: subject.name,
      topicName,
      questionCount,
      difficultyLevel,
    });

    if (!generation.questions || generation.questions.length === 0) {
      throw AppError.badRequest(
        'No se pudieron generar preguntas a partir de estos apuntes. Escribe frases completas (al menos una por pregunta) e inténtalo de nuevo.'
      );
    }

    const createdIds = [];
    for (const question of generation.questions) {
      const id = await exerciseModel.create(req.user.id, {
        subjectId,
        topicId: topicId ?? null,
        title: question.title,
        statement: question.statement,
        exerciseType: question.exerciseType,
        difficultyLevel: question.difficultyLevel,
        source: 'note_to_quiz',
        options: question.options,
        correctAnswer: question.correctAnswer,
        solution: question.solution,
        isActive: true,
      });
      createdIds.push(id);
    }

    const exercises = (
      await Promise.all(createdIds.map((id) => exerciseModel.findById(id)))
    ).filter(Boolean);

    sendSuccess(res, {
      status: 201,
      message: `Se generaron ${exercises.length} ejercicio(s) a partir de tus apuntes.`,
      data: {
        exercises,
        generation: {
          source: generation.source,
          provider: generation.provider,
          model: generation.model,
          isAiConfigured: generation.isAiConfigured,
          aiGenerated: generation.aiGenerated,
          providerNotice: generation.providerNotice || null,
          disclaimer: generation.disclaimer,
          dataProvenance: generation.dataProvenance,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
