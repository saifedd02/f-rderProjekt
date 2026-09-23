/**
 * The shared extraction schema in the strict form the Claude and OpenAI
 * structured-output APIs require (`additionalProperties: false` on every
 * object). Same fields and enums as `SEARCH_RESPONSE_SCHEMA` — only the
 * strictness marker differs.
 */
export function strictSchema<T>(schema: T): T {
  if (Array.isArray(schema)) return schema.map(strictSchema) as T;
  if (!schema || typeof schema !== "object") return schema;

  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) copy[key] = strictSchema(value);
  if (copy.type === "object") copy.additionalProperties = false;
  return copy as T;
}
