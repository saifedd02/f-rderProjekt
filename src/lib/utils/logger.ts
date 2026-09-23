/**
 * Minimal namespaced logger.
 *
 * Server-side diagnostics go through here rather than bare `console.*` so every
 * line is prefixed consistently and verbosity can be changed in one place.
 * Warnings and errors are always emitted; info is suppressed in production.
 */
type LogArgs = unknown[];

const isProduction = process.env.NODE_ENV === "production";

export interface Logger {
  info: (...args: LogArgs) => void;
  warn: (...args: LogArgs) => void;
  error: (...args: LogArgs) => void;
}

export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;

  return {
    info: (...args: LogArgs) => {
      if (!isProduction) console.info(prefix, ...args);
    },
    warn: (...args: LogArgs) => console.warn(prefix, ...args),
    error: (...args: LogArgs) => console.error(prefix, ...args),
  };
}
