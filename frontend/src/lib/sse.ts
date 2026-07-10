const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

export interface QueryDoneMeta {
  sql_model: string;
  sql_prompt_tokens: number;
  sql_completion_tokens: number;
  sql_cost_usd: number;
  answer_model: string;
  answer_prompt_tokens: number;
  answer_completion_tokens: number;
  answer_cost_usd: number;
  total_cost_usd: number;
}

export type QueryEvent =
  | { event: "status"; data: { stage: string; message: string } }
  | { event: "sql"; data: { sql: string } }
  | {
      event: "rows";
      data: { columns: string[]; rows: Record<string, unknown>[]; row_count: number };
    }
  | { event: "answer"; data: { delta: string } }
  | { event: "done"; data: { meta: QueryDoneMeta } }
  | { event: "error"; data: { code: string; message: string; details: unknown } };

export interface QueryStream {
  events: AsyncGenerator<QueryEvent>;
  abort: () => void;
}

/**
 * Wraps POST /query's SSE contract (status -> sql -> rows -> answer* -> done|error)
 * as an async event stream. EventSource can't be used since it's GET-only;
 * this parses the same wire format by hand over a fetch ReadableStream.
 */
export function streamQuery(question: string): QueryStream {
  const controller = new AbortController();

  async function* run(): AsyncGenerator<QueryEvent> {
    const response = await fetch(`${BASE_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawMessage = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        let eventName = "";
        let dataLine = "";
        for (const line of rawMessage.split("\n")) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
        }
        if (!eventName || !dataLine) continue;

        yield { event: eventName, data: JSON.parse(dataLine) } as QueryEvent;
      }
    }
  }

  return { events: run(), abort: () => controller.abort() };
}
