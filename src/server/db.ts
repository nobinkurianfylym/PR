import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * The slice of Cloudflare D1's API this app uses, declared locally so client
 * code never depends on @cloudflare/workers-types (whose globals collide
 * with DOM lib types in a Next app).
 */
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export interface D1Client {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
}

/** The worker's D1 binding — available in route handlers at runtime. */
export function db(): D1Client {
  return (getCloudflareContext().env as unknown as { DB: D1Client }).DB;
}

/** Minimal R2 surface used by the Asset Vault. */
export interface R2Client {
  put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<void>;
}

export function bucket(): R2Client {
  return (getCloudflareContext().env as unknown as { BUCKET: R2Client }).BUCKET;
}
