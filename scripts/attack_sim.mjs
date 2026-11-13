const target = process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:8787';
const probes = [
  '/api/v1/customers/export',
  '/api/v1/orders/export',
  '/api/v1/reports/download',
  '/api/v1/debug-preview',
];

const requests = probes.flatMap((path) =>
  Array.from({ length: 4 }, () => ({
    url: new URL(path, target),
    options: {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
        'X-Aegis-Demo': '1',
      },
    },
  })),
);

const responses = [];
for (const { url, options } of requests) {
  const response = await fetch(url, options);
  responses.push({
    path: url.pathname,
    status: response.status,
    body: await response.text(),
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
}

const successful = responses.filter((response) => response.status === 200).length;
const blocked = responses.length - successful;
console.log(`Sent ${responses.length} probes: ${successful} reached Aegis, ${blocked} blocked upstream.`);
for (const response of responses) {
  console.log(`${response.status} ${response.path} ${response.body.slice(0, 160)}`);
}
