import Anthropic from '@anthropic-ai/sdk';

// Proxy serverless Vercel — menjaga ANTHROPIC_API_KEY tetap di server (tidak masuk bundle browser).
// Client (src/lib/ai.js) POST { system, user, model, temperature, max_tokens } → balas { text }.
// Model dikunci ke allowlist (Haiku 4.5 untuk scoring, Sonnet 4.6 untuk summary) agar tak
// bisa disalahgunakan dari sisi klien.

const ALLOWED_MODELS = new Set(['claude-haiku-4-5', 'claude-sonnet-4-6']);
const DEFAULT_MODEL = 'claude-sonnet-4-6';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY belum diset di Environment Variables Vercel (server).' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { system, user, model, temperature, max_tokens } = body;

    if (!user || typeof user !== 'string') {
      res.status(400).json({ error: 'Field "user" (prompt) wajib diisi.' });
      return;
    }
    const useModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

    const client = new Anthropic(); // membaca ANTHROPIC_API_KEY dari env
    const message = await client.messages.create({
      model: useModel,
      max_tokens: Math.min(Math.max(Number(max_tokens) || 2048, 256), 8192),
      temperature: typeof temperature === 'number' ? temperature : 0.3,
      system: typeof system === 'string' && system.trim() ? system : undefined,
      messages: [{ role: 'user', content: user }],
    });

    const text = (message.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    res.status(200).json({ text });
  } catch (err) {
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message || 'Gagal memanggil Claude API.' });
  }
}
