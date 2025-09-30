import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import path from 'node:path';
import fs from 'node:fs';
import fastifyStatic from '@fastify/static';
import { analyzeLatex } from './latex/analyzer.js';

const server = Fastify({ logger: true });

await server.register(cors, { origin: true });
await server.register(multipart, { limits: { fileSize: 20 * 1024 * 1024, files: 1 } });

const WEB_DIST = path.resolve(process.cwd(), '../web/dist');
if (fs.existsSync(WEB_DIST)) {
  await server.register(fastifyStatic, { root: WEB_DIST, prefix: '/' });
}

server.get('/healthz', async () => ({ status: 'ok' }));

server.post('/api/analyze', async (req: any, reply) => {
  const mp = await req.file();
  if (!mp) {
    return reply.code(400).send({ error: 'Missing file' });
  }
  const filename = mp.filename || 'uploaded.tex';
  if (!filename.endsWith('.tex')) {
    return reply.code(400).send({ error: 'Only .tex files are supported' });
  }
  const buffer = await mp.toBuffer();
  const content = buffer.toString('utf8');
  const result = analyzeLatex(content);
  const wordLimit = req?.query?.wordLimit ? Number(req.query.wordLimit) : undefined;
  const maxReferences = req?.query?.maxReferences ? Number(req.query.maxReferences) : undefined;

  const constraints: Record<string, unknown> = {};
  if (typeof wordLimit === 'number' && !Number.isNaN(wordLimit)) {
    constraints.wordLimit = {
      limit: wordLimit,
      withinLimit: result.words <= wordLimit,
      overBy: Math.max(0, result.words - wordLimit),
      remaining: Math.max(0, wordLimit - result.words),
    };
  }
  if (typeof maxReferences === 'number' && !Number.isNaN(maxReferences)) {
    const totalRefs = Math.max(result.references.bibItems, result.references.uniqueCiteKeys);
    constraints.maxReferences = {
      limit: maxReferences,
      withinLimit: totalRefs <= maxReferences,
      overBy: Math.max(0, totalRefs - maxReferences),
      remaining: Math.max(0, maxReferences - totalRefs),
    };
  }

  return reply.send({ filename, ...result, constraints });
});

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

server.listen({ port, host }).then(() => {
  server.log.info(`Server listening on http://${host}:${port}`);
});


