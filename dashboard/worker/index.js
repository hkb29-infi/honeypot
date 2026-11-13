export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/_aegis/stats") {
      const headers = { "Cache-Control": "no-store" };
      if (request.method !== "GET") {
        return Response.json({ error: "Method not allowed" }, {
          status: 405, headers: { ...headers, Allow: "GET" },
        });
      }
      if (!env.HONEYPOT) {
        return Response.json({ error: "Configure the HONEYPOT service binding or VITE_STATS_URL." }, {
          status: 503, headers,
        });
      }
      try {
        // Keep the destination fixed; don't forward browser cookies or arbitrary paths.
        const upstream = await env.HONEYPOT.fetch(new Request("https://honeypot.internal/_aegis/stats", {
          headers: { Accept: "application/json" },
        }));
        return new Response(upstream.body, {
          status: upstream.status,
          headers: { ...headers, "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
        });
      } catch {
        return Response.json({ error: "The honeypot Worker is unavailable." }, { status: 502, headers });
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
      });
    }

		return new Response(null, { status: 404 });
  },
}
