// Tavily web search — used by enrich.ts to pull a "why now" signal per company.

import { tavily } from "@tavily/core";
import { config, has } from "@/lib/config";

let _client: ReturnType<typeof tavily> | null = null;
function client() {
  if (!_client) _client = tavily({ apiKey: config.tavilyApiKey });
  return _client;
}

export async function getWebSignal(company: string): Promise<string> {
  if (!has.tavily()) {
    const signal = `${company} recently announced new product features and is actively hiring in sales and engineering`;
    console.log(`[tavily stub] getWebSignal("${company}") → "${signal}"`);
    return signal;
  }
  const response = await client().search(
    `${company} latest news funding hiring 2024 2025`,
    { maxResults: 3, searchDepth: "basic" }
  );
  const snippets = response.results.map((r) => r.content ?? r.title).join(" ");
  return snippets.slice(0, 500) || `${company} is active in their market`;
}
