/**
 * TỐI NAY WEB GÌ? - Cloudflare Worker Backend (V2.2.1)
 *
 * Endpoints:
 * - GET  /stats         : Returns { totalOpens: number }
 * - POST /open-case     : Atomically increments and returns { totalOpens: number }
 * - GET  /github-stars  : Returns { stars: number } (cached ~10m)
 */

const ALLOWED_ORIGINS = [
  'https://tranhuuquyet.github.io',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:3000'
];

// In-memory cache for GitHub stars (Worker instance scope)
let starsCache = {
  count: null,
  expiresAt: 0
};

// In-memory sliding window rate limit map for POST /open-case
// Stores: Map<hash, { count, resetAt }> — transient, no PII stored in DB
const rateLimitMap = new Map();

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://tranhuuquyet.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(data, status = 200, corsHeaders = {}, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders
    }
  });
}

function checkRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';
  const now = Date.now();
  const windowMs = 10000; // 10 seconds
  const maxRequests = 2; // Max 2 case opens per 10s per transient client key

  // Simple numeric hash to avoid retaining raw IP
  let hash = 0;
  for (let i = 0; i < ip.length; i += 1) {
    hash = (hash * 31 + ip.charCodeAt(i)) >>> 0;
  }

  const record = rateLimitMap.get(hash);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(hash, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request);

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. GET /stats
      if (request.method === 'GET' && path === '/stats') {
        if (!env.DB) {
          return jsonResponse({ totalOpens: 0, error: 'Database not bound' }, 200, corsHeaders);
        }
        const row = await env.DB.prepare(
          "SELECT value FROM counters WHERE key = 'case_opens'"
        ).first();

        const totalOpens = row ? Number(row.value) : 0;
        return jsonResponse({ totalOpens }, 200, corsHeaders, {
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
      }

      // 2. POST /open-case
      if (request.method === 'POST' && path === '/open-case') {
        if (!checkRateLimit(request)) {
          return jsonResponse({ error: 'Rate limit exceeded. Please wait.' }, 429, corsHeaders);
        }

        if (!env.DB) {
          return jsonResponse({ totalOpens: 1, error: 'Database not bound' }, 200, corsHeaders);
        }

        // Atomically increment counter
        const result = await env.DB.prepare(`
          UPDATE counters
          SET value = value + 1
          WHERE key = 'case_opens'
          RETURNING value
        `).first();

        const totalOpens = result ? Number(result.value) : 1;
        return jsonResponse({ totalOpens }, 200, corsHeaders, {
          'Cache-Control': 'no-store'
        });
      }

      // 3. GET /github-stars
      if (request.method === 'GET' && path === '/github-stars') {
        const now = Date.now();
        if (starsCache.count !== null && now < starsCache.expiresAt) {
          return jsonResponse({ stars: starsCache.count }, 200, corsHeaders);
        }

        try {
          const ghRes = await fetch('https://api.github.com/repos/TranHuuQuyet/Toinaywebgi', {
            headers: {
              'User-Agent': 'Toinaywebgi-Worker/2.2',
              'Accept': 'application/vnd.github.v3+json'
            }
          });

          if (ghRes.ok) {
            const ghData = await ghRes.json();
            if (typeof ghData.stargazers_count === 'number') {
              starsCache = {
                count: ghData.stargazers_count,
                expiresAt: now + 10 * 60 * 1000 // 10 minutes cache
              };
              return jsonResponse({ stars: starsCache.count }, 200, corsHeaders);
            }
          }
        } catch {
          // If GitHub API fails, return cached count if available
          if (starsCache.count !== null) {
            return jsonResponse({ stars: starsCache.count }, 200, corsHeaders);
          }
        }

        return jsonResponse({ stars: null }, 200, corsHeaders);
      }

      return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
    } catch (err) {
      return jsonResponse({ error: err.message || 'Internal error' }, 500, corsHeaders);
    }
  }
};
