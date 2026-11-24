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
const GEMINI_FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

/**
 * Solicita una respuesta a un modelo concreto de Gemini.
 * Reintenta una vez ante saturacion (5xx); ante cuota agotada, permisos o
 * modelo inexistente no insiste (pasa al siguiente modelo).
 */
const requestGeminiModel = async (model, body) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.ai.geminiApiKey}`;
  let notice = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    if (attempt > 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
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
        // Cuota agotada o modelo no disponible: probar otro modelo, no este de nuevo.
        if (!TRANSIENT_STATUSES.has(response.status)) return { text: null, notice };
      }
    } catch (apiErr) {
      const aborted = apiErr.name === 'AbortError';
      notice = `No se pudo contactar con Gemini (${aborted ? 'tiempo de espera agotado' : apiErr.message}).`;
      // Si el proveedor no responde, reintentar o cambiar de modelo alargaria la espera.
      return { text: null, notice, aborted };
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
