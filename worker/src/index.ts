import { analyzeLatex } from './latex/analyzer';

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
  // CORS
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-headers', '*');
  headers.set('access-control-allow-methods', 'POST,OPTIONS');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return json({ ok: true }, { status: 204 });
    }

    if (url.pathname === '/api/analyze' && request.method === 'POST') {
      try {
        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) {
          return json({ error: 'Missing file' }, { status: 400 });
        }
        if (!file.name.endsWith('.tex')) {
          return json({ error: 'Only .tex files are supported' }, { status: 400 });
        }
        const content = await file.text();
        const result = analyzeLatex(content);

        const wordLimit = url.searchParams.get('wordLimit');
        const maxReferences = url.searchParams.get('maxReferences');
        const constraints: Record<string, unknown> = {};
        if (wordLimit !== null && wordLimit !== '') {
          const limit = Number(wordLimit);
          if (!Number.isNaN(limit)) {
            constraints.wordLimit = {
              limit,
              withinLimit: result.words <= limit,
              overBy: Math.max(0, result.words - limit),
              remaining: Math.max(0, limit - result.words),
            };
          }
        }
        if (maxReferences !== null && maxReferences !== '') {
          const limit = Number(maxReferences);
          if (!Number.isNaN(limit)) {
            const totalRefs = Math.max(result.references.bibItems, result.references.uniqueCiteKeys);
            constraints.maxReferences = {
              limit,
              withinLimit: totalRefs <= limit,
              overBy: Math.max(0, totalRefs - limit),
              remaining: Math.max(0, limit - totalRefs),
            };
          }
        }

        return json({ filename: file.name, ...result, constraints });
      } catch (err) {
        return json({ error: (err as Error).message }, { status: 500 });
      }
    }

    return json({ error: 'Not Found' }, { status: 404 });
  },
};


