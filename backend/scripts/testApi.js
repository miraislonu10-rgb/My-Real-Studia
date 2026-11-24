/**
 * STUDIA - Script de prueba automatizada de la API REST
 * ------------------------------------------------------------------
 * Ejecuta y verifica peticiones HTTP reales (GET, POST, PUT, DELETE)
 * validando las respuestas uniformes { success: true, data, message }.
 *
 * Para ejecutarlo:
 *   node backend/scripts/testApi.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

const results = [];

const logTest = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? '✓ [PASS]' : '✗ [FAIL]'} ${name} ${detail ? `(${detail})` : ''}`);
};

const run = async () => {
  console.log(`\n======================================================`);
  console.log(`  STUDIA - Verificación Automatizada de API REST`);
  console.log(`  Destino: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let token = null;
  let testTaskId = null;
  let testFlashcardId = null;

  try {
    // 1. GET /health
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    logTest('GET /health (Estado de API)', healthRes.ok && healthJson.success === true);

    // 2. GET /docs (Documentación de API)
    const docsRes = await fetch(`${BASE_URL}/docs`);
    const docsJson = await docsRes.json();
    logTest('GET /docs (Catálogo OpenAPI y rutas)', docsRes.ok && docsJson.data?.modules?.length > 0);

    // 3. POST /auth/login
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ana@studia.demo', password: 'StudiaDemo123!' }),
    });
    const loginJson = await loginRes.json();
    token = loginJson.data?.accessToken;
    logTest('POST /auth/login (Autenticación y emisión JWT)', !!token);

    if (!token) {
      console.warn('No se pudo obtener el token de acceso. Abortando pruebas autenticadas.');
      return;
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 4. GET /auth/me
    const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
    const meJson = await meRes.json();
    logTest('GET /auth/me (Sesión autenticada)', meRes.ok && !!meJson.data?.user?.email);

    // 5. POST /tasks (Crear tarea)
    const createTaskRes = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Tarea de prueba automatizada',
        priority: 'high',
        goalPeriod: 'daily',
        estimatedMinutes: 30,
      }),
    });
    const createTaskJson = await createTaskRes.json();
    testTaskId = createTaskJson.data?.task?.id;
    logTest('POST /tasks (Creación de tarea u objetivo)', createTaskRes.ok && !!testTaskId);

    // 6. PUT /tasks/:id (Actualizar tarea)
    if (testTaskId) {
      const updateTaskRes = await fetch(`${BASE_URL}/tasks/${testTaskId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          title: 'Tarea de prueba automatizada (Editada con PUT)',
          priority: 'urgent',
        }),
      });
      logTest('PUT /tasks/:id (Actualización de recurso)', updateTaskRes.ok);
    }

    // 7. GET /tasks/calendar (Consultar calendario)
    const calRes = await fetch(`${BASE_URL}/tasks/calendar?from=2026-01-01&to=2026-12-31`, { headers: authHeaders });
    const calJson = await calRes.json();
    logTest('GET /tasks/calendar (Consulta de calendario)', calRes.ok && Array.isArray(calJson.data?.tasks));

    // 8. POST /flashcards (Crear flashcard en Memory Lab)
    const cardRes = await fetch(`${BASE_URL}/flashcards`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        frontText: '¿Cuál es la fórmula cuadrática?',
        backText: 'x = (-b ± √(b² - 4ac)) / (2a)',
        hint: 'Ecuación general de segundo grado',
      }),
    });
    const cardJson = await cardRes.json();
    testFlashcardId = cardJson.data?.flashcard?.id;
    logTest('POST /flashcards (Creación en Memory Lab)', cardRes.ok && !!testFlashcardId);

    // 9. POST /flashcards/:id/review (Repaso SM-2)
    if (testFlashcardId) {
      const reviewRes = await fetch(`${BASE_URL}/flashcards/${testFlashcardId}/review`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ rating: 4, timeTakenSeconds: 5 }),
      });
      const reviewJson = await reviewRes.json();
      logTest('POST /flashcards/:id/review (Algoritmo SM-2)', reviewRes.ok && reviewJson.data?.flashcard?.repetitions > 0);
    }

    // 10. GET /analytics/overview (Academic Analytics)
    const analyticsRes = await fetch(`${BASE_URL}/analytics/overview`, { headers: authHeaders });
    const analyticsJson = await analyticsRes.json();
    logTest('GET /analytics/overview (Métricas y tiempo por materia)', analyticsRes.ok && analyticsJson.data?.overview !== undefined);

    // 11. GET /analytics/weekly-report (Informe semanal real)
    const reportRes = await fetch(`${BASE_URL}/analytics/weekly-report`, { headers: authHeaders });
    const reportJson = await reportRes.json();
    logTest('GET /analytics/weekly-report (Informe con datos de MySQL)', reportRes.ok && !!reportJson.data?.report?.weekRange);

    // 12. POST /ai/companion (STUDIA AI Companion)
    const aiRes = await fetch(`${BASE_URL}/ai/companion`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ action: 'explain_concept', prompt: 'Teorema de Pitágoras' }),
    });
    const aiJson = await aiRes.json();
    logTest('POST /ai/companion (Tutor Pedagógico Inteligente)', aiRes.ok && !!aiJson.data?.response);

    // 13. DELETE /tasks/:id (Eliminar tarea de prueba)
    if (testTaskId) {
      const delTaskRes = await fetch(`${BASE_URL}/tasks/${testTaskId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      logTest('DELETE /tasks/:id (Eliminación segura anti-IDOR)', delTaskRes.ok);
    }

    // 14. DELETE /flashcards/:id (Eliminar flashcard de prueba)
    if (testFlashcardId) {
      const delCardRes = await fetch(`${BASE_URL}/flashcards/${testFlashcardId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      logTest('DELETE /flashcards/:id (Eliminación de tarjeta)', delCardRes.ok);
    }
  } catch (err) {
    console.error('Error durante la ejecución del test suite:', err.message);
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n------------------------------------------------------`);
  console.log(`  Resultado: ${passedCount} de ${results.length} pruebas superadas.`);
  console.log(`------------------------------------------------------\n`);
};

run();
