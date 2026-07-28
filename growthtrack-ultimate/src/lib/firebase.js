// Firebase / Gemini stub — provides a safe fallback when Firebase is not configured.
// AiDashboard.jsx imports { askGemini } from '../lib/firebase'

import { fetchWithRetry, retryConfig } from '../utils/apiRetry';

/**
 * askGemini — calls Gemini via Firebase Cloud Function (if configured),
 * otherwise throws so AiDashboard can display its offline fallback message.
 * @param {string} prompt
 * @param {string} model
 * @returns {Promise<string>}
 */
export async function askGemini(prompt, model = 'gemini-1.5-flash') {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey    = import.meta.env.VITE_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    throw new Error('Firebase credentials not configured (VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_API_KEY missing).');
  }

  // Direct Gemini REST API via Firebase API key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
    }),
  }, retryConfig.standard);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini API error ${res.status}: ${err?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}
