export interface Env {
  AI: Ai;
  THREAT_KV: KVNamespace;
  DB: D1Database;
  ASSETS: Fetcher;
  ORIGIN_URL?: string;
  THREAT_THRESHOLD?: string;
}

interface RequestCf {
  asn?: number;
  botManagement?: {
    score?: number;
  };
  colo?: string;
  country?: string;
}

export interface ThreatAssessment {
  score: number;
  reasons: string[];
}

type CloudflareRequest = Request & {
  cf?: RequestCf;
};

const HONEYPOT_PATHS = [
  '/admin',
  '/.env',
  '/wp-login.php',
  '/api/v1/debug',
  '/api/v1/users/dump',
];
const AUTOMATED_USER_AGENT =
  /aegis-demo|curl|python-requests|scrapy|sqlmap|nikto|httpclient/i;
const INJECTION_SIGNATURE = /('|--|UNION\s+SELECT|\.\.\/)/i;
const DEFAULT_THRESHOLD = 50;
const RATE_LIMIT = 15;
export const DECOY_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
const DECOY_CACHE_VERSION = 'v2';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === '/_aegis/stats') {
      return handleStats(request, env);
    }

    const assessment = await assessThreat(request, env);
    const threshold = parseThreshold(env.THREAT_THRESHOLD);

    if (assessment.score < threshold) {
      return proxyToOrigin(request, env);
    }

    const decoyPayload = await getDecoyPayload(request, url, env, ctx);
    const cf = (request as CloudflareRequest).cf ?? {};
    const ip = request.headers.get('CF-Connecting-IP') ?? '127.0.0.1';

    ctx.waitUntil(
      env.DB.prepare(
        `INSERT INTO attack_logs
          (ip, country, asn, method, path, reason, threat_score, decoy_served)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          ip,
          cf.country ?? 'XX',
          cf.asn ?? 0,
          request.method,
          url.pathname,
          assessment.reasons.join('; '),
          assessment.score,
          decoyPayload.slice(0, 500),
        )
        .run(),
    );

    return new Response(decoyPayload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Powered-By': 'Express',
        'X-Aegis-Action': 'decoy',
      },
    });
  },
};

export async function assessThreat(
  request: Request,
  env: Pick<Env, 'THREAT_KV'>,
): Promise<ThreatAssessment> {
  const url = new URL(request.url);
  const ua = request.headers.get('User-Agent') ?? '';
  const demoSignal = request.headers.get('X-Aegis-Demo') === '1';
  const cf = (request as CloudflareRequest).cf ?? {};
  const ip = request.headers.get('CF-Connecting-IP') ?? '127.0.0.1';
  let score = 0;
  const reasons: string[] = [];

  if (HONEYPOT_PATHS.some((path) => url.pathname.startsWith(path))) {
    score += 80;
    reasons.push('Probed canary/restricted path');
  }

  if (!ua || AUTOMATED_USER_AGENT.test(ua)) {
    score += 50;
    reasons.push(`Automated User-Agent: ${ua || 'empty'}`);
  }

  if (demoSignal) {
    score += 50;
    reasons.push('Aegis demo signal');
  }

  if (INJECTION_SIGNATURE.test(url.search)) {
    score += 90;
    reasons.push('Injection/Traversal signature in query');
  }

  if (cf.botManagement?.score !== undefined && cf.botManagement.score < 30) {
    score += 30;
    reasons.push(`Cloudflare bot score: ${cf.botManagement.score}`);
  }

  const rateKey = `rate:${ip}`;
  const currentCount = Number.parseInt((await env.THREAT_KV.get(rateKey)) ?? '0', 10);
  if (!Number.isFinite(currentCount)) {
    throw new Error(`Invalid rate counter stored for ${rateKey}`);
  }
  await env.THREAT_KV.put(rateKey, String(currentCount + 1), {
    expirationTtl: 60,
  });

  if (currentCount >= RATE_LIMIT) {
    score += 60;
    reasons.push(`Rate anomaly (${currentCount + 1} req/min)`);
  }

  return { score, reasons };
}

async function getDecoyPayload(
  request: Request,
  url: URL,
  env: Env,
  ctx: ExecutionContext,
): Promise<string> {
  const cacheKey = `decoy:${DECOY_CACHE_VERSION}:${request.method}:${url.pathname}`;
  const cached = await env.THREAT_KV.get(cacheKey);
  if (cached) {
    return cached;
  }

  const aiResponse = await env.AI.run(DECOY_MODEL, {
    messages: [
      {
        role: 'system',
        content:
          'You are a deceptive API honeypot. Generate realistic-looking fake JSON data matching the requested REST endpoint. Output only valid raw JSON with no markdown fences or commentary.',
      },
      {
        role: 'user',
        content: `Endpoint: ${request.method} ${url.pathname}${url.search}`,
      },
    ],
    max_tokens: 300,
  });

  let response =
    'response' in aiResponse && typeof aiResponse.response === 'string'
      ? normalizeJsonPayload(aiResponse.response)
      : undefined;
  if (!response) {
    console.error('Workers AI returned a non-JSON decoy payload');
    response = JSON.stringify({
      status: 'success',
      records: [],
      message: 'No records found',
    });
  }

  ctx.waitUntil(
    env.THREAT_KV.put(cacheKey, response, {
      expirationTtl: 600,
    }),
  );
  return response;
}

export function normalizeJsonPayload(payload: string): string | undefined {
  const candidates = [
    payload,
    payload.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim(),
  ];

  const objectStart = payload.indexOf('{');
  const objectEnd = payload.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(payload.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    if (isJsonObject(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function isJsonObject(payload: string): boolean {
  try {
    const parsed: unknown = JSON.parse(payload);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

async function proxyToOrigin(request: Request, env: Env): Promise<Response> {
  if (!env.ORIGIN_URL) {
    const cf = (request as CloudflareRequest).cf ?? {};
    return Response.json({
      ok: true,
      message: 'Legitimate request verified at Cloudflare Edge',
      edge_colo: cf.colo ?? 'LOCAL',
      data: {
        items: ['Public Catalog Item A', 'Public Catalog Item B'],
      },
    });
  }

  const originUrl = new URL(request.url);
  const configuredOrigin = new URL(env.ORIGIN_URL);
  originUrl.protocol = configuredOrigin.protocol;
  originUrl.host = configuredOrigin.host;
  originUrl.username = configuredOrigin.username;
  originUrl.password = configuredOrigin.password;
  return fetch(new Request(originUrl, request));
}

async function handleStats(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== 'GET') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: { ...corsHeaders, Allow: 'GET, OPTIONS' } },
    );
  }

  const { results } = await env.DB.prepare(
    `SELECT id, timestamp, ip, country, asn, method, path, reason,
            threat_score, decoy_served
     FROM attack_logs
     ORDER BY id DESC
     LIMIT 25`,
  ).all();
  return Response.json(
    { status: 'active', intercepted: results },
    { headers: corsHeaders },
  );
}

function parseThreshold(value: string | undefined): number {
  if (!value) {
    return DEFAULT_THRESHOLD;
  }
  const threshold = Number.parseInt(value, 10);
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new Error(`Invalid THREAT_THRESHOLD: ${value}`);
  }
  return threshold;
}
