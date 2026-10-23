import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildApp } from '../server';

/**
 * Single Vercel Function that serves the whole Express backend.
 *
 * vercel.json rewrites every `/api/*` request to `/api/index?__path=<original path>`
 * (the two legacy single-file endpoints, noor-ai and pdf-proxy, are still served
 * directly from the filesystem, which takes precedence over rewrites).
 *
 * Vercel rewrites may or may not preserve the request path, so `restoreUrl()`
 * rebuilds `/api/<path>?<original query>` before handing the request to Express.
 */

let appPromise: Promise<any> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = buildApp().catch((err) => {
      // Reset so the next request can retry a cold-start failure.
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

function restoreUrl(req: VercelRequest) {
  const rawUrl: string = req.url || '/';
  const qIndex = rawUrl.indexOf('?');
  let pathname = qIndex === -1 ? rawUrl : rawUrl.slice(0, qIndex);
  const params = new URLSearchParams(qIndex === -1 ? '' : rawUrl.slice(qIndex + 1));

  // Vercel may pass __path both in req.url and in req.query; read either.
  let sub = params.get('__path');
  if (sub === null && req.query && typeof req.query.__path === 'string') {
    sub = req.query.__path;
  }
  params.delete('__path');

  if (sub !== null) {
    const clean = sub.replace(/^\/+/, '').replace(/\/+$/, '');
    pathname = clean ? `/api/${clean}` : '/api';
  } else if (pathname === '/api/index' || pathname === '/api/index/') {
    // No __path available: nothing better to do than the API root.
    pathname = '/api';
  }

  const search = params.toString();
  req.url = search ? `${pathname}?${search}` : pathname;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    restoreUrl(req);
    const app = await getApp();
    // Express app is itself a (req, res) handler.
    return app(req as any, res as any);
  } catch (err: any) {
    console.error('[api/index] Unhandled error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
  }
}
