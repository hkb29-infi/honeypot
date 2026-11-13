import { describe, expect, it, vi } from 'vitest';
import worker, {
  assessThreat,
  DECOY_MODEL,
  normalizeJsonPayload,
} from '../src/index';

function createKv(values: Record<string, string> = {}): KVNamespace {
  const store = new Map(Object.entries(values));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    props: {},
  } as unknown as ExecutionContext;
}

describe('assessThreat', () => {
  it('flags restricted paths and automated clients', async () => {
    const assessment = await assessThreat(
      new Request('https://example.test/api/v1/users/dump', {
        headers: {
          'User-Agent': 'curl/8.0',
          'CF-Connecting-IP': '192.0.2.1',
        },
      }),
      { THREAT_KV: createKv() },
    );

    expect(assessment.score).toBe(130);
    expect(assessment.reasons).toEqual([
      'Probed canary/restricted path',
      'Automated User-Agent: curl/8.0',
    ]);
  });

  describe('Workers AI configuration', () => {
    it('uses a current supported decoy model', () => {
      expect(DECOY_MODEL).toBe('@cf/meta/llama-4-scout-17b-16e-instruct');
    });

    it('recovers JSON wrapped in model markdown or explanatory text', () => {
      expect(normalizeJsonPayload('```json\n{"records":[]}\n```')).toBe(
        '{"records":[]}',
      );
      expect(normalizeJsonPayload('Here you go: {"records":[]}')).toBe(
        '{"records":[]}',
      );
      expect(normalizeJsonPayload('not JSON')).toBeUndefined();
    });
  });

  it('adds a velocity signal after the limit is exceeded', async () => {
    const kv = createKv({ 'rate:192.0.2.2': '15' });
    const assessment = await assessThreat(
      new Request('https://example.test/catalog', {
        headers: { 'CF-Connecting-IP': '192.0.2.2' },
      }),
      { THREAT_KV: kv },
    );

    expect(assessment.score).toBe(110);
    expect(assessment.reasons).toContain('Rate anomaly (16 req/min)');
  });

  it('recognizes the safe demo bot signal', async () => {
    const assessment = await assessThreat(
      new Request('https://example.test/api/v1/customers/export', {
        headers: {
          'User-Agent': 'Aegis-Demo-Bot/1.0',
          'CF-Connecting-IP': '192.0.2.3',
        },
      }),
      { THREAT_KV: createKv() },
    );

    expect(assessment.score).toBe(50);
    expect(assessment.reasons).toContain(
      'Automated User-Agent: Aegis-Demo-Bot/1.0',
    );
  });

  it('recognizes the explicit demo header with a normal browser user-agent', async () => {
    const assessment = await assessThreat(
      new Request('https://example.test/catalog/items', {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'X-Aegis-Demo': '1',
          'CF-Connecting-IP': '192.0.2.4',
        },
      }),
      { THREAT_KV: createKv() },
    );

    expect(assessment.score).toBe(50);
    expect(assessment.reasons).toContain('Aegis demo signal');
  });
});

describe('worker routing', () => {
  it('returns the local legitimate response below the threshold', async () => {
    const response = await worker.fetch(
      new Request('https://example.test/catalog', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }),
      {
        THREAT_KV: createKv(),
        AI: {} as Ai,
        DB: {} as D1Database,
        ASSETS: {} as Fetcher,
      },
      createExecutionContext(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });
});
