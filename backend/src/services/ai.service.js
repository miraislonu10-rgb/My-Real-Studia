/**
 * STUDIA - Servicio de Inteligencia Artificial (AI Companion)
 * ------------------------------------------------------------------
 * Funcionalidades del asistente pedagógico inteligente:
 *   1. Explicar conceptos.
 *   2. Generar ejercicios prácticos.
 *   3. Proporcionar pistas progresivas.
 *   4. Explicar respuestas incorrectas.
 *   5. Analizar errores frecuentes.
 *   6. Recomendar teoría de refuerzo.
 *   7. Crear planes de repaso personalizados.
 *
 * SEGURIDAD Y PRIVACIDAD:
 *   - Las claves API viven exclusivamente en variables de entorno (GEMINI_API_KEY / OPENAI_API_KEY).
 *   - El backend actúa de pasarela intermediaria; ninguna clave se expone al cliente.
 *   - El asistente solo recibe los datos académicos estrictamente pertinentes del estudiante
 *     (materias matriculadas, temas con errores recientes y perfil cognitivo).
 *   - No inventa integración si no hay clave: reporta transparentemente el estado y
 *     utiliza el motor pedagógico local determinista de STUDIA, distinguiendo siempre
 *     entre datos reales del estudiante y sugerencias generadas por IA.
 */

import { env } from '../config/env.js';
import * as subjectModel from '../models/subject.model.js';
import * as errorModel from '../models/error.model.js';
import * as learningProfileModel from '../models/learningProfile.model.js';

/**
 * Ejecuta una peticion HTTP contra el proveedor de IA con tiempo de espera.
 * Evita que una API externa lenta bloquee la peticion del estudiante.
 */
const requestWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.ai.timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/** Extrae y valida el texto devuelto por Google Gemini. */
const extractGeminiText = (json) => {
  const parts = json?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((part) => part?.text).filter(Boolean).join('\n')
    : '';
  return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
};

/** Extrae y valida el texto devuelto por un proveedor compatible con OpenAI. */
const extractOpenAiText = (json) => {
  const text = json?.choices?.[0]?.message?.content;
  return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
};

/**
 * Traduce el error del proveedor Gemini a un aviso claro para el estudiante.
 * La capa gratuita de Google limita a ~20 solicitudes al dia por modelo; al
 * agotarse responde 429 (y, segun el tipo de clave, tambien 403), momento en
 * el que STUDIA usa el motor pedagogico local sin inventar una respuesta de IA.
 */
const describeGeminiError = (status, rawBody) => {
  let detail = '';
  try {
    detail = JSON.parse(rawBody)?.error?.message || '';
  } catch {
    detail = rawBody || '';
  }

  const quotaExceeded =
    status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(detail);
  if (quotaExceeded) {
    return 'Se agotó la cuota del plan gratuito de Gemini (unas 20 solicitudes al día por modelo). Se muestra la respuesta del motor local de STUDIA; vuelve a intentarlo más tarde o configura otro proveedor de IA.';
  }

  if (status === 403) {
    return 'El proveedor Gemini rechazó la solicitud (403): puede ser que la cuota diaria esté agotada o que el modelo configurado no esté habilitado para tu clave. Se muestra el motor local de STUDIA.';
  }

  return `El proveedor Gemini respondió con estado ${status}.`;
};

/**
 * Estados transitorios del proveedor (saturacion momentanea): merece la pena
 * reintentar el mismo modelo antes de descartarlo.
 */
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);

/**
 * Modelos de respaldo de Gemini, en orden de preferencia.
 * La capa gratuita limita la cuota DIARIA POR MODELO: si el modelo principal
 * agota su cuota (429/403) o no esta disponible (404), STUDIA prueba estos
 * antes de recurrir al motor pedagogico local.
 */
const GEMINI_FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

/**
 * Solicita una respuesta a un modelo concreto de Gemini.
 * Reintenta ante saturacion (5xx) y ante cortes de red puntuales (fetch failed);
 * ante cuota agotada, permisos o modelo inexistente no insiste (pasa al siguiente modelo).
 */
const requestGeminiModel = async (model, body) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.ai.geminiApiKey}`;
  let notice = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (attempt > 1) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }

    try {
      const response = await requestWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const text = extractGeminiText(await response.json());
        if (text) return { text, notice: null };
        notice = `El modelo ${model} no devolvió texto utilizable.`;
      } else {
        notice = describeGeminiError(response.status, await response.text());
        // Cuota agotada, permisos o modelo inexistente: no insistir con este modelo.
        if (!TRANSIENT_STATUSES.has(response.status)) return { text: null, notice };
      }
    } catch (apiErr) {
      const aborted = apiErr.name === 'AbortError';
      notice = `No se pudo contactar con Gemini (${aborted ? 'tiempo de espera agotado' : apiErr.message}).`;
      // Un tiempo de espera agotado no mejora reintentando: se pasa al siguiente modelo.
      if (aborted) return { text: null, notice, aborted };
      // Corte de red puntual: reintentar el mismo modelo antes de descartarlo.
    }
  }

  return { text: null, notice };
};

/**
 * Obtiene el contexto académico pertinente y seguro del estudiante.
 */
const getStudentAcademicContext = async (userId) => {
  try {
    const [subjectsResult, recentErrorsResult, profile] = await Promise.all([
      subjectModel.list({ userId, limit: 10 }),
      errorModel.list({ userId, limit: 5 }),
      learningProfileModel.findByUserId(userId),
    ]);

    const subjects = (subjectsResult?.rows || []).map((s) => s.name);
    const recentErrors = (recentErrorsResult?.rows || []).map((e) => ({
      title: e.exerciseTitle || e.title,
      type: e.errorType,
      subject: e.subjectName || 'General',
      explanation: e.explanation,
    }));

    const dynamicProfile = profile?.dynamicProfile || {};
    const archetype = dynamicProfile.archetypeTitle || 'Estratega Multidimensional';

    return {
      subjects,
      recentErrors,
      archetype,
      dominantTraits: dynamicProfile.dominantTraits || [],
    };
  } catch {
    return { subjects: [], recentErrors: [], archetype: 'General', dominantTraits: [] };
  }
};

/**
 * Invoca el proveedor de IA (Google Gemini API / OpenAI compatible) o activa el motor local.
 */
export const queryAiCompanion = async (userId, { action, prompt, subjectName, topicName, exerciseText, userAnswer, correctAnswer }) => {
  // Proveedor activo segun las credenciales presentes en el entorno.
  const provider = env.ai.geminiApiKey ? 'gemini' : env.ai.openaiApiKey ? 'openai' : null;

  // Extraer contexto del estudiante
  const context = await getStudentAcademicContext(userId);

  // Instrucciones del sistema
  const systemPrompt = `Eres STUDIA AI Companion, el tutor de aprendizaje inteligente de la plataforma STUDIA.
Tu propósito es guiar al estudiante de manera pedagógica, empática y rigurosa.
Contexto académico del estudiante:
- Materias actuales: ${context.subjects.join(', ') || 'General'}.
- Perfil cognitivo de aprendizaje: ${context.archetype}.
- Rasgos de estudio: ${context.dominantTraits.join(', ') || 'Enfoque práctico y conceptual'}.

Pautas esenciales:
1. Sé claro, constructivo y estructurado.
2. Si explicas un concepto o respuesta, no te limites a dar la respuesta: explica el razonamiento detrás.
3. Si das pistas, proporciona una pista que estimule el pensamiento sin revelar la respuesta de golpe.
4. Adapta tu explicación al perfil (${context.archetype}).
5. Distingue con claridad los hechos conceptuales verificados de las recomendaciones prácticas.`;

  // Construir el mensaje del usuario según la acción solicitada
  let userInstruction = prompt || '';
  switch (action) {
    case 'explain_concept':
      userInstruction = `Por favor explica el siguiente concepto o tema académico de forma clara y con un ejemplo práctico: "${prompt || topicName || subjectName}".`;
      break;
    case 'generate_exercise':
      userInstruction = `Genera un ejercicio práctico de nivel intermedio para la materia "${subjectName || 'General'}" sobre el tema "${topicName || prompt || 'práctica'}". Incluye el enunciado, datos necesarios, opciones o pasos sugeridos, y la solución explicada al final.`;
      break;
    case 'provide_hint':
      userInstruction = `Para el siguiente ejercicio o problema: "${exerciseText || prompt}", proporciona una pista pedagógica progresiva que me oriente hacia la solución sin darme la respuesta final.`;
      break;
    case 'explain_wrong_answer':
      userInstruction = `En el ejercicio: "${exerciseText || prompt}", proporcioné la respuesta: "${userAnswer}" pero la respuesta correcta es: "${correctAnswer}". Explícame detalladamente por qué mi respuesta fue errónea, qué concepto o paso confundí y cómo llegar a la solución correcta.`;
      break;
    case 'analyze_frequent_errors':
      userInstruction = `Analiza mis errores recientes registrados en STUDIA: ${JSON.stringify(context.recentErrors)}. Identifica qué patrones cognitivos comunes tengo y dame 3 acciones concretas para no volver a repetirlos.`;
      break;
    case 'recommend_theory':
      userInstruction = `Considerando mis errores y materias (${context.subjects.join(', ')}), recomiéndame qué temas teóricos y fundamentos debo repasar con prioridad esta semana y por qué.`;
      break;
    case 'personalized_review':
      userInstruction = `Diseña un plan de repaso activo personalizado para mí de 30 minutos, enfocado en afianzar mis materias débiles conforme a mi perfil (${context.archetype}).`;
      break;
  }

  // Si existe una credencial real configurada, se consulta al proveedor externo.
  let aiText = null;
  let providerNotice = null;
  let modelUsed = null;

  if (provider === 'gemini') {
    // Modelo configurado primero; despues los de respaldo (cuota diaria por modelo).
    const candidateModels = [env.ai.geminiModel, ...GEMINI_FALLBACK_MODELS].filter(
      (model, index, all) => model && all.indexOf(model) === index
    );
    modelUsed = env.ai.geminiModel;

    const geminiBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nInstrucción del estudiante:\n${userInstruction}` }],
        },
      ],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
    };

    for (const model of candidateModels) {
      const result = await requestGeminiModel(model, geminiBody);

      if (result.text) {
        aiText = result.text;
        modelUsed = model;
        break;
      }

      providerNotice = result.notice;
      console.warn('[ai]', `${model}: ${result.notice}`);
      // Proveedor inalcanzable: cambiar de modelo no ayudaria.
      if (result.aborted) break;
    }
  } else if (provider === 'openai') {
    modelUsed = env.ai.openaiModel;
    try {
      const response = await requestWithTimeout(`${env.ai.openaiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.ai.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: env.ai.openaiModel,
          temperature: 0.4,
          max_tokens: 1200,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInstruction },
          ],
        }),
      });

      if (response.ok) {
        aiText = extractOpenAiText(await response.json());
      } else {
        providerNotice = `El proveedor de IA respondió con estado ${response.status}.`;
        console.warn('[ai]', providerNotice);
      }
    } catch (apiErr) {
      providerNotice = `No se pudo contactar con el proveedor de IA (${
        apiErr.name === 'AbortError' ? 'tiempo de espera agotado' : apiErr.message
      }).`;
      console.warn('[ai]', providerNotice);
    }
  }

  // Respuesta REAL del proveedor de IA: validada y no vacia.
  if (aiText) {
    return {
      isAiConfigured: true,
      source: provider === 'gemini' ? 'gemini_ai' : 'openai_ai',
      provider,
      model: modelUsed,
      action,
      response: aiText,
      disclaimer: `Respuesta generada por el modelo ${modelUsed} de STUDIA AI Companion a partir de tu contexto académico.`,
      dataProvenance: {
        studentRecordsUsed: ['materias inscritas', 'errores recientes', 'perfil cognitivo'],
        counts: { subjects: context.subjects.length, recentErrors: context.recentErrors.length },
        aiGenerated: true,
        note: 'Los datos académicos provienen de tus registros reales en MySQL; el texto del tutor es una sugerencia generada por IA y no sustituye una evaluación oficial.',
      },
    };
  }

  // Motor Pedagógico Local Determinista de STUDIA (sin credenciales o si el proveedor falla).
  const localResponse = generateLocalPedagogicalResponse(action, {
    prompt: userInstruction,
    subjectName,
    topicName,
    exerciseText,
    userAnswer,
    correctAnswer,
    context,
  });

  return {
    isAiConfigured: !!provider,
    source: 'local_companion',
    provider: provider || 'local',
    model: provider ? modelUsed : null,
    action,
    response: localResponse,
    providerNotice,
    disclaimer: provider
      ? 'El proveedor de IA no devolvió una respuesta válida; se utilizó el motor pedagógico local de STUDIA como respaldo.'
      : 'Modo Asistente Académico STUDIA (sin credenciales de IA configuradas). Define GEMINI_API_KEY u OPENAI_API_KEY en backend/.env para activar la generación en vivo.',
    dataProvenance: {
      studentRecordsUsed: ['materias inscritas', 'errores recientes', 'perfil cognitivo'],
      counts: { subjects: context.subjects.length, recentErrors: context.recentErrors.length },
      aiGenerated: false,
      note: 'El texto fue compuesto por el motor pedagógico local de STUDIA a partir de tus registros reales; no proviene de un modelo de IA externo.',
    },
  };
};

/**
 * Motor pedagógico local determinista de STUDIA.
 * Ofrece explicaciones estructuradas, pistas y guías cuando aún no se ha configurado la clave API externa.
 */
const generateLocalPedagogicalResponse = (action, { prompt, subjectName, topicName, exerciseText, userAnswer, correctAnswer, context }) => {
  const archetype = context.archetype || 'Estratega Multidimensional';

  switch (action) {
    case 'explain_concept':
      return `### Explicación pedagógica de STUDIA: ${topicName || subjectName || 'Concepto'}

**1. Definición clave:**
Un concepto central en esta materia consiste en identificar los principios fundamentales y las relaciones de causa y efecto. Conforme a tu perfil (${archetype}), la mejor forma de asimilarlo es vincular la regla abstracta con una aplicación directa.

**2. Desglose en pasos:**
- **Paso 1:** Identifica las variables o premisas iniciales del problema.
- **Paso 2:** Aplica la ley o fórmula correspondiente verificando la consistencia dimensional o lógica.
- **Paso 3:** Contrasta el resultado con un caso límite para comprobar su validez.

**3. Recomendación de estudio:**
Elabora un esquema rápido de 3 ramas en tu cuaderno o crea una tarjeta en **Memory Lab** para fijarlo en tu memoria a largo plazo.`;

    case 'provide_hint':
      return `### Pista guiada de STUDIA

**Pista metodológica para resolver el ejercicio:**
1. Observa con atención qué datos explícitos te entrega el enunciado y cuál es la incógnita exacta que se te pide encontrar.
2. ¿Qué propiedad, teorema o fórmula matemática relaciona directamente estos datos sin añadir variables desconocidas adicionales?
3. Intenta despejar la incógnita antes de sustituir valores numéricos para evitar arrastrar errores de cálculo.`;

    case 'explain_wrong_answer':
      return `### Análisis del error y corrección pedagógica

- **Ejercicio analizado:** ${exerciseText || 'Ejercicio de práctica'}
- **Tu respuesta:** \`${userAnswer || 'Respuesta no especificada'}\`
- **Respuesta esperada:** \`${correctAnswer || 'Solución correcta'}\`

**¿Por qué ocurrió la discrepancia?**
La diferencia entre tu respuesta y la correcta usualmente se debe a un error en la interpretación de signos, en el orden de operaciones o en la aplicación de una propiedad distributiva o conceptual.

**Cómo resolverlo con éxito:**
Revisa el paso inmediatamente anterior al resultado final. Asegúrate de verificar las unidades y sustituir de nuevo los valores en la ecuación original para corroborar la igualdad. Puedes registrar este caso en tu **Diario de errores** para monitorear si es un patrón recurrente.`;

    case 'analyze_frequent_errors':
      return `### Análisis de patrones de errores frecuentes en STUDIA

Hemos analizado tus registros en la base de datos:
- Se detectaron errores clasificados principalmente en las categorías: **${context.recentErrors.map((e) => e.type).filter(Boolean).join(', ') || 'Conceptuales y de Cálculo'}**.
- **Recomendación cognitiva (${archetype}):**
  1. Antes de iniciar un examen o práctica, escribe las 3 fórmulas clave en un borrador (recuerdo activo).
  2. Implementa la "Regla de los 30 segundos": al terminar un problema, dedica medio minuto a comprobar que el resultado tenga sentido físico o lógico.
  3. Convierte cada error en una tarjeta en **Memory Lab** para programar su repaso espaciado.`;

    case 'recommend_theory':
      return `### Recomendaciones teóricas de refuerzo

Basado en tus materias activas (${context.subjects.join(', ') || 'Asignaturas de estudio'}):
1. **Refuerzo prioritario:** Repasa las definiciones y axiomas iniciales antes de continuar con problemas avanzados.
2. **Estrategia sugerida:** Dedica un bloque de 25 minutos en **Smart Focus** enfocado exclusivamente en lectura activa y esquematización.
3. **Validación:** Resuelve 3 ejercicios de nivel básico para afianzar el dominio conceptual antes de subir la dificultad.`;

    default:
      return `### Asistente Académico STUDIA Companion

He procesado tu consulta pedagógica: "${prompt}".

**Sugerencia personalizada para tu perfil (${archetype}):**
- Divide la tarea en pequeños bloques manejables.
- Utiliza la técnica de auto-explicación: intenta explicar la solución en voz alta con tus propias palabras.
- Apóyate en el planificador **Smart Planner** para calendarizar tus repasos sin sobrecargar tu disponibilidad.`;
  }
};

/* ==========================================================================
 * NOTE-TO-QUIZ
 * --------------------------------------------------------------------------
 * Convierte los APUNTES del estudiante en preguntas de estudio estructuradas.
 * Usa el mismo proveedor de IA (Gemini/OpenAI) que el AI Companion y, cuando
 * no hay credencial o el proveedor falla, un generador LOCAL determinista que
 * extrae preguntas directamente de las frases de los apuntes (nunca inventa
 * contenido ajeno al texto aportado).
 * ========================================================================== */

/** Tipos de ejercicio admitidos por el ENUM de la tabla `exercises`. */
const QUIZ_TYPES = ['multiple_choice', 'open_answer', 'true_false'];
const QUIZ_DIFFICULTIES = ['easy', 'medium', 'hard'];

/** Extrae el primer objeto JSON valido del texto devuelto por el modelo. */
const parseQuizJson = (raw) => {
  if (!raw) return null;
  const cleaned = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();

  const tryParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  let data = tryParse(cleaned);
  if (!data) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) data = tryParse(cleaned.slice(start, end + 1));
  }

  const list = Array.isArray(data) ? data : data?.questions;
  return Array.isArray(list) ? list : null;
};

/** Normaliza y valida una pregunta generada por el modelo. */
const normalizeQuestion = (item, fallbackDifficulty) => {
  if (!item || typeof item !== 'object') return null;

  const statement = String(item.statement || item.question || '').trim();
  if (!statement) return null;

  const exerciseType = QUIZ_TYPES.includes(item.exerciseType) ? item.exerciseType : 'open_answer';
  const difficultyLevel = QUIZ_DIFFICULTIES.includes(item.difficultyLevel)
    ? item.difficultyLevel
    : fallbackDifficulty;

  let options = null;
  if (exerciseType === 'multiple_choice') {
    const rawOptions = Array.isArray(item.options) ? item.options : [];
    options = rawOptions
      .map((option) => (typeof option === 'string' ? option : option?.text || option?.label || ''))
      .map((text) => String(text).trim())
      .filter(Boolean)
      .slice(0, 6);
    if (options.length < 2) return null;
  } else if (exerciseType === 'true_false') {
    options = ['Verdadero', 'Falso'];
  }

  return {
    title: String(item.title || 'Pregunta generada').trim().slice(0, 200),
    statement,
    exerciseType,
    difficultyLevel,
    options,
    correctAnswer: item.correctAnswer ? String(item.correctAnswer).trim() : null,
    solution: item.solution ? String(item.solution).trim() : null,
  };
};

/**
 * Generador local determinista: construye preguntas a partir de las frases de
 * los apuntes. Detecta definiciones ("Termino: definicion"), enunciados
 * completables (oculta la palabra mas significativa) y, en su defecto,
 * afirmaciones para verdadero/falso.
 */
const generateLocalQuiz = (notes, { count, difficultyLevel }) => {
  const lines = String(notes || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((line) => line.length >= 15);

  const questions = [];

  for (const line of lines) {
    if (questions.length >= count) break;

    const definition = line.match(/^(.{3,80}?)\s*(?::|=|\bes\b)\s+(.{8,})$/i);
    if (definition) {
      const term = definition[1].trim();
      questions.push({
        title: `Define: ${term.slice(0, 60)}`,
        statement: `Explica con tus palabras qué es o qué significa: "${term}".`,
        exerciseType: 'open_answer',
        difficultyLevel,
        options: null,
        correctAnswer: definition[2].trim(),
        solution: `Según tus apuntes: ${line}`,
      });
      continue;
    }

    const words = line.split(/\s+/);
    const lettersOnly = (word) => word.replace(/[^\p{L}\p{N}]/gu, '');
    let longestIndex = -1;
    words.forEach((word, index) => {
      const clean = lettersOnly(word);
      if (clean.length >= 6 && (longestIndex === -1 || clean.length > lettersOnly(words[longestIndex]).length)) {
        longestIndex = index;
      }
    });

    if (longestIndex !== -1) {
      const answer = lettersOnly(words[longestIndex]);
      const blanked = words.map((word, index) => (index === longestIndex ? '______' : word)).join(' ');
      questions.push({
        title: 'Completa el enunciado',
        statement: `Completa según tus apuntes: ${blanked}`,
        exerciseType: 'open_answer',
        difficultyLevel,
        options: null,
        correctAnswer: answer,
        solution: line,
      });
      continue;
    }

    questions.push({
      title: 'Verdadero o falso',
      statement: `Verdadero o falso (según tus apuntes): ${line}`,
      exerciseType: 'true_false',
      difficultyLevel,
      options: ['Verdadero', 'Falso'],
      correctAnswer: 'Verdadero',
      solution: 'Afirmación tomada directamente de tus apuntes.',
    });
  }

  return questions.slice(0, count);
};

/**
 * Note-to-Quiz: transforma apuntes en preguntas estructuradas listas para
 * guardarse como ejercicios. Devuelve la misma metadata de procedencia que el
 * asistente para distinguir lo generado por IA de lo derivado localmente.
 *
 * @param {number} userId
 * @param {{notes:string, subjectName?:string, topicName?:string,
 *          questionCount?:number, difficultyLevel?:'easy'|'medium'|'hard'}} params
 */
export const generateQuizFromNotes = async (
  userId,
  { notes, subjectName, topicName, questionCount = 5, difficultyLevel = 'medium' }
) => {
  const count = Math.min(Math.max(Number(questionCount) || 5, 1), 20);
  const difficulty = QUIZ_DIFFICULTIES.includes(difficultyLevel) ? difficultyLevel : 'medium';
  const provider = env.ai.geminiApiKey ? 'gemini' : env.ai.openaiApiKey ? 'openai' : null;

  const systemPrompt = `Eres STUDIA Quiz Generator, un generador de cuestionarios academicos de la plataforma STUDIA.
Convierte los apuntes del estudiante en preguntas de estudio.
Devuelve EXCLUSIVAMENTE un objeto JSON valido con esta forma exacta:
{"questions":[{"title":"...","statement":"...","exerciseType":"multiple_choice|open_answer|true_false","difficultyLevel":"easy|medium|hard","options":["..."],"correctAnswer":"...","solution":"..."}]}
Reglas: "options" solo se rellena en multiple_choice (de 2 a 5 alternativas) y en true_false (["Verdadero","Falso"]); no inventes contenido que no este respaldado por los apuntes.`;

  const userInstruction = `Genera ${count} preguntas de dificultad ${difficulty} a partir de estos apuntes.
Materia: ${subjectName || 'General'}.
Tema: ${topicName || 'General'}.

APUNTES:
"""
${String(notes).slice(0, 8000)}
"""`;

  let raw = null;
  let providerNotice = null;
  let modelUsed = null;

  if (provider === 'gemini') {
    const candidateModels = [env.ai.geminiModel, ...GEMINI_FALLBACK_MODELS].filter(
      (model, index, all) => model && all.indexOf(model) === index
    );
    modelUsed = env.ai.geminiModel;

    const geminiBody = {
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userInstruction}` }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
    };

    for (const model of candidateModels) {
      const result = await requestGeminiModel(model, geminiBody);
      if (result.text) {
        raw = result.text;
        modelUsed = model;
        break;
      }
      providerNotice = result.notice;
      console.warn('[ai:quiz]', `${model}: ${result.notice}`);
      if (result.aborted) break;
    }
  } else if (provider === 'openai') {
    modelUsed = env.ai.openaiModel;
    try {
      const response = await requestWithTimeout(`${env.ai.openaiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.ai.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: env.ai.openaiModel,
          temperature: 0.5,
          max_tokens: 2000,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInstruction },
          ],
        }),
      });

      if (response.ok) {
        raw = extractOpenAiText(await response.json());
      } else {
        providerNotice = `El proveedor de IA respondió con estado ${response.status}.`;
        console.warn('[ai:quiz]', providerNotice);
      }
    } catch (apiErr) {
      providerNotice = `No se pudo contactar con el proveedor de IA (${
        apiErr.name === 'AbortError' ? 'tiempo de espera agotado' : apiErr.message
      }).`;
      console.warn('[ai:quiz]', providerNotice);
    }
  }

  const parsed = parseQuizJson(raw);
  const normalized = (parsed || []).map((item) => normalizeQuestion(item, difficulty)).filter(Boolean);

  if (normalized.length > 0) {
    return {
      isAiConfigured: true,
      source: provider === 'gemini' ? 'gemini_ai' : 'openai_ai',
      provider,
      model: modelUsed,
      aiGenerated: true,
      questionCount: normalized.length,
      questions: normalized,
      disclaimer: `Cuestionario generado por el modelo ${modelUsed} de STUDIA a partir de tus apuntes.`,
      dataProvenance: {
        studentRecordsUsed: ['apuntes del estudiante'],
        inputCharacters: String(notes).length,
        aiGenerated: true,
        note: 'Las preguntas son una sugerencia generada por IA a partir del texto que escribiste; revísalas antes de estudiarlas.',
      },
    };
  }

  const localQuestions = generateLocalQuiz(notes, { count, difficultyLevel: difficulty });

  return {
    isAiConfigured: !!provider,
    source: 'local_generator',
    provider: provider || 'local',
    model: provider ? modelUsed : null,
    aiGenerated: false,
    questionCount: localQuestions.length,
    questions: localQuestions,
    providerNotice,
    disclaimer: provider
      ? 'El proveedor de IA no devolvió un cuestionario válido; se generaron preguntas con el motor local de STUDIA.'
      : 'Modo generador local de STUDIA (sin credenciales de IA configuradas). Define GEMINI_API_KEY u OPENAI_API_KEY en backend/.env para activar la generación con IA.',
    dataProvenance: {
      studentRecordsUsed: ['apuntes del estudiante'],
      inputCharacters: String(notes).length,
      aiGenerated: false,
      note: 'Las preguntas fueron construidas por el motor local de STUDIA extrayendo frases de tus apuntes; no provienen de un modelo de IA externo.',
    },
  };
};

/* ==========================================================================
 * STUDY RESCUE
 * --------------------------------------------------------------------------
 * Comenta el plan de rescate pre-examen YA CALCULADO sobre datos reales
 * (dominio por tema, errores recurrentes, tarjetas pendientes): redacta un
 * diagnostico global y una estrategia pedagogica por bloque. Reutiliza el
 * mismo proveedor (Gemini/OpenAI) que el AI Companion y, cuando no hay
 * credencial o el proveedor falla, un generador LOCAL determinista que
 * compone los comentarios desde los mismos datos reales. Nunca inventa
 * materias, temas ni cifras que no esten en el plan.
 * ========================================================================== */

/** Extrae el primer objeto JSON valido del texto devuelto por el modelo. */
const parseRescueJson = (raw) => {
  if (!raw) return null;
  const cleaned = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();

  const tryParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  let data = tryParse(cleaned);
  if (!data) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) data = tryParse(cleaned.slice(start, end + 1));
  }

  return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
};

/** Normaliza la respuesta del modelo: diagnostico + estrategias por indice. */
const normalizeRescue = (data, itemCount) => {
  if (!data) return null;

  const diagnostic =
    typeof data.diagnostic === 'string' ? data.diagnostic.trim().slice(0, 1200) : '';
  const blocks = (Array.isArray(data.blocks) ? data.blocks : [])
    .map((block) => ({
      index: Number(block?.index),
      focus: typeof block?.focus === 'string' ? block.focus.trim().slice(0, 60) : '',
      strategy: typeof block?.strategy === 'string' ? block.strategy.trim().slice(0, 1000) : '',
    }))
    .filter(
      (block) =>
        Number.isInteger(block.index) && block.index >= 0 && block.index < itemCount && block.strategy
    );

  if (!diagnostic && blocks.length === 0) return null;
  return { diagnostic, blocks };
};

/** Estrategia local determinista para un bloque, segun su motivo real. */
const localBlockStrategy = (item) => {
  if (item.masteryScore !== null && item.masteryScore < 35) {
    return 'Reconstruye la base: repasa la teoria esencial del tema, resuelve 3 ejercicios guiados y explica el procedimiento en voz alta al terminar.';
  }
  if (item.masteryScore !== null && item.masteryScore < 55) {
    return 'Refuerza con practica deliberada: resuelve de 5 a 8 ejercicios de dificultad media y anota cada fallo para corregirlo al final del bloque.';
  }
  if (item.masteryScore !== null) {
    return 'Consolida con practica variada y preguntas mixtas, centrandote en la velocidad y la precision en condiciones de examen.';
  }
  if (/tarjeta/i.test(item.title)) {
    return 'Repaso espaciado: repasa las tarjetas pendientes en Memory Lab y gradua con honestidad tu nivel de recuerdo.';
  }
  if (/error/i.test(item.title)) {
    return 'Analisis de errores: revisa cada patron en Error DNA, explica por que ocurrio y resuelve un ejercicio similar para corregirlo.';
  }
  return 'Dedica un bloque enfocado: estudia el tema y comprueba tu avance resolviendo ejercicios al final.';
};

/** Etiqueta corta del foco de un bloque (motor local). */
const localBlockFocus = (item) => {
  if (item.masteryScore !== null && item.masteryScore < 35) return 'Reconstruir la base';
  if (item.masteryScore !== null) return 'Refuerzo practico';
  if (/tarjeta/i.test(item.title)) return 'Repaso espaciado';
  if (/error/i.test(item.title)) return 'Corregir errores';
  return 'Estudio enfocado';
};

/** Compone el plan comentado con el motor local determinista de STUDIA. */
const generateLocalRescue = (plan) => {
  const weakCount = plan.context?.weakTopics?.length || 0;
  const diagnostic =
    plan.itemCount > 0
      ? `Quedan ${plan.daysAvailable} día(s) hasta el examen y tienes ${plan.itemCount} bloque(s) planificados. Prioriza los ${weakCount} tema(s) de menor dominio, corrige tus errores recurrentes y cierra cada sesión con un repaso activo.`
      : 'No se detectaron temas débiles, errores recurrentes ni tarjetas pendientes: mantén tu repaso habitual hasta el examen.';

  const blocks = (plan.items || []).map((item, index) => ({
    index,
    focus: localBlockFocus(item),
    strategy: localBlockStrategy(item),
  }));

  return { diagnostic, blocks };
};

/**
 * Study Rescue: comenta con IA el plan de rescate ya calculado sobre datos
 * reales. Devuelve un diagnostico global y una estrategia por bloque, con la
 * misma metadata de procedencia que el resto del modulo de IA.
 *
 * @param {object} plan Plan de `studyRescueModel.buildPlan` (con `subjectName`).
 */
export const generateRescuePlan = async (plan) => {
  const items = Array.isArray(plan.items) ? plan.items : [];
  const provider = env.ai.geminiApiKey ? 'gemini' : env.ai.openaiApiKey ? 'openai' : null;

  const systemPrompt = `Eres STUDIA Study Rescue Coach, un entrenador académico de la plataforma STUDIA.
Recibes un plan de rescate pre-examen YA CALCULADO a partir de los datos reales del estudiante (dominio por tema, errores recurrentes y tarjetas pendientes).
Tu tarea es COMENTARLO pedagógicamente, sin cambiar fechas, prioridades ni duraciones.
Devuelve EXCLUSIVAMENTE un objeto JSON válido con esta forma exacta:
{"diagnostic":"...","blocks":[{"index":0,"focus":"...","strategy":"..."}]}
Reglas:
- "diagnostic": diagnóstico global breve (2-4 frases): situación, riesgo y enfoque recomendado. Motivador y concreto.
- "blocks": un objeto por CADA bloque recibido, repitiendo su MISMO "index".
- "strategy": 1-3 frases con una estrategia de estudio concreta y accionable para ese bloque (técnica, pasos y cómo comprobar el avance).
- "focus": etiqueta de 2-4 palabras con el foco del bloque.
- Escribe en español y no inventes materias, temas ni cifras que no aparezcan en los datos.`;

  const blockLines = items
    .map((item, index) =>
      [
        index,
        item.title,
        item.subjectName || plan.subjectName || 'Sin materia',
        item.masteryScore !== null ? `dominio ${item.masteryScore}%` : 'sin dominio medido',
        item.priority,
        `${item.estimatedMinutes} min`,
        item.reason || item.description,
      ].join(' | ')
    )
    .join('\n');

  const userInstruction = `Fecha del examen: ${plan.examDate} (${plan.daysAvailable} día(s) disponibles).
Tiempo disponible al día: ${plan.availableMinutesPerDay} min.
Materia objetivo: ${plan.subjectName || 'Todas mis materias'}.
Temas débiles considerados: ${plan.context?.weakTopics?.map((t) => `${t.name} (${t.masteryScore}%)`).join(', ') || 'ninguno'}.
Tarjetas pendientes de repaso: ${plan.context?.dueFlashcards ?? 0}.
Patrones de error recurrentes: ${plan.context?.recurringPatterns ?? 0}.
Bloques del plan (index | título | materia | dominio | prioridad | minutos | motivo):
${blockLines || '(sin bloques)'}`;

  let raw = null;
  let providerNotice = null;
  let modelUsed = null;

  if (provider === 'gemini') {
    const candidateModels = [env.ai.geminiModel, ...GEMINI_FALLBACK_MODELS].filter(
      (model, index, all) => model && all.indexOf(model) === index
    );
    modelUsed = env.ai.geminiModel;

    const geminiBody = {
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userInstruction}` }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
    };

    for (const model of candidateModels) {
      const result = await requestGeminiModel(model, geminiBody);
      if (result.text) {
        raw = result.text;
        modelUsed = model;
        break;
      }
      providerNotice = result.notice;
      console.warn('[ai:rescue]', `${model}: ${result.notice}`);
      if (result.aborted) break;
    }
  } else if (provider === 'openai') {
    modelUsed = env.ai.openaiModel;
    try {
      const response = await requestWithTimeout(`${env.ai.openaiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.ai.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: env.ai.openaiModel,
          temperature: 0.5,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInstruction },
          ],
        }),
      });

      if (response.ok) {
        raw = extractOpenAiText(await response.json());
      } else {
        providerNotice = `El proveedor de IA respondió con estado ${response.status}.`;
        console.warn('[ai:rescue]', providerNotice);
      }
    } catch (apiErr) {
      providerNotice = `No se pudo contactar con el proveedor de IA (${
        apiErr.name === 'AbortError' ? 'tiempo de espera agotado' : apiErr.message
      }).`;
      console.warn('[ai:rescue]', providerNotice);
    }
  }

  const provenanceCounts = {
    weakTopics: plan.context?.weakTopics?.length || 0,
    dueFlashcards: plan.context?.dueFlashcards || 0,
    recurringPatterns: plan.context?.recurringPatterns || 0,
    blocks: items.length,
  };

  const normalized = normalizeRescue(parseRescueJson(raw), items.length);
  const local = generateLocalRescue(plan);

  // Comentario REAL del proveedor de IA: validado y no vacio.
  if (normalized) {
    const aiBlocks = new Map(normalized.blocks.map((block) => [block.index, block]));
    const blocks = items.map((_, index) => {
      const aiBlock = aiBlocks.get(index);
      const localBlock = local.blocks[index];
      return {
        index,
        focus: aiBlock?.focus || localBlock.focus,
        strategy: aiBlock?.strategy || localBlock.strategy,
      };
    });

    return {
      isAiConfigured: true,
      source: provider === 'gemini' ? 'gemini_ai' : 'openai_ai',
      provider,
      model: modelUsed,
      aiGenerated: true,
      diagnostic: normalized.diagnostic || local.diagnostic,
      blocks,
      disclaimer: `Plan comentado por el modelo ${modelUsed} de STUDIA a partir de tus datos académicos reales.`,
      dataProvenance: {
        studentRecordsUsed: [
          'dominio por tema (Knowledge Map)',
          'errores recurrentes (Error DNA)',
          'tarjetas pendientes (Memory Lab)',
        ],
        counts: provenanceCounts,
        aiGenerated: true,
        note: 'Las fechas, prioridades y duraciones provienen de tus registros reales en MySQL; los comentarios y estrategias son sugerencias generadas por IA.',
      },
    };
  }

  // Motor local determinista (sin credenciales o si el proveedor falla).
  return {
    isAiConfigured: !!provider,
    source: 'local_rescue',
    provider: provider || 'local',
    model: provider ? modelUsed : null,
    aiGenerated: false,
    diagnostic: local.diagnostic,
    blocks: local.blocks,
    providerNotice,
    disclaimer: provider
      ? 'El proveedor de IA no devolvió un plan comentado válido; se usó el motor local de STUDIA.'
      : 'Modo Study Rescue local de STUDIA (sin credenciales de IA configuradas). Define GEMINI_API_KEY u OPENAI_API_KEY en backend/.env para activar los comentarios con IA.',
    dataProvenance: {
      studentRecordsUsed: [
        'dominio por tema (Knowledge Map)',
        'errores recurrentes (Error DNA)',
        'tarjetas pendientes (Memory Lab)',
      ],
      counts: provenanceCounts,
      aiGenerated: false,
      note: 'El diagnóstico y las estrategias fueron compuestos por el motor local de STUDIA a partir de tus registros reales; no provienen de un modelo de IA externo.',
    },
  };
};
