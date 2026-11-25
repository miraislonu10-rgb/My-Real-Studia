import assert from 'node:assert/strict';
import test from 'node:test';

import { env } from '../src/config/env.js';
import { generateRescuePlan } from '../src/services/ai.service.js';

const samplePlan = () => ({
  examDate: '2026-12-01',
  daysAvailable: 7,
  availableMinutesPerDay: 90,
  itemCount: 2,
  context: {
    weakTopics: [{ name: 'Ecuaciones', masteryScore: 25 }],
    dueFlashcards: 2,
    recurringPatterns: 1,
  },
  items: [
    {
      title: 'Rescate: Ecuaciones',
      subjectName: 'Matemáticas',
      masteryScore: 25,
      priority: 'urgent',
      estimatedMinutes: 60,
      reason: 'Dominio real bajo.',
    },
    {
      title: 'Reforzar errores recurrentes',
      subjectName: 'Matemáticas',
      masteryScore: null,
      priority: 'high',
      estimatedMinutes: 30,
      reason: 'Hay errores registrados.',
    },
  ],
});

const withMockGemini = async (modelResponse, run) => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = env.ai.geminiApiKey;
  const originalModel = env.ai.geminiModel;
  const requests = [];

  env.ai.geminiApiKey = 'unit-test-key';
  env.ai.geminiModel = 'gemini-unit-test';
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), body: JSON.parse(options.body) });
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: modelResponse }] } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  try {
    await run(requests);
  } finally {
    globalThis.fetch = originalFetch;
    env.ai.geminiApiKey = originalApiKey;
    env.ai.geminiModel = originalModel;
  }
};

test('Study Rescue completa con respaldo local los bloques que Gemini omite', async () => {
  const modelResponse = JSON.stringify({
    diagnostic: 'Refuerza primero la base antes de aumentar la dificultad.',
    blocks: [
      {
        index: 0,
        focus: 'Base conceptual',
        strategy: 'Resuelve ejercicios guiados y explica cada paso.',
      },
      { index: 99, focus: 'Fuera del plan', strategy: 'Este bloque no debe incluirse.' },
    ],
  });

  await withMockGemini(modelResponse, async (requests) => {
    const result = await generateRescuePlan(samplePlan());

    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /gemini-unit-test/);
    assert.equal(requests[0].body.generationConfig.responseMimeType, 'application/json');
    assert.equal(result.source, 'gemini_ai');
    assert.equal(result.aiGenerated, true);
    assert.equal(result.blocks.length, 2);
    assert.equal(result.blocks[0].strategy, 'Resuelve ejercicios guiados y explica cada paso.');
    assert.ok(result.blocks[1].strategy.length > 0);
    assert.equal(result.blocks[1].index, 1);
  });
});

test('Study Rescue usa el plan local si Gemini devuelve JSON inválido', async () => {
  await withMockGemini('respuesta que no es JSON', async () => {
    const result = await generateRescuePlan(samplePlan());

    assert.equal(result.source, 'local_rescue');
    assert.equal(result.aiGenerated, false);
    assert.equal(result.blocks.length, 2);
    assert.ok(result.blocks.every((block) => block.strategy.length > 0));
  });
});

test('Study Rescue funciona sin credenciales y no llama al proveedor', async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = env.ai.geminiApiKey;
  const originalOpenAiKey = env.ai.openaiApiKey;

  env.ai.geminiApiKey = '';
  env.ai.openaiApiKey = '';
  globalThis.fetch = async () => {
    throw new Error('No se esperaba ninguna llamada externa.');
  };

  try {
    const result = await generateRescuePlan(samplePlan());
    assert.equal(result.source, 'local_rescue');
    assert.equal(result.provider, 'local');
    assert.equal(result.aiGenerated, false);
    assert.equal(result.blocks.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    env.ai.geminiApiKey = originalGeminiKey;
    env.ai.openaiApiKey = originalOpenAiKey;
  }
});
