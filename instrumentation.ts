/**
 * Next.js instrumentation hook. Loads the appropriate Sentry config
 * for whichever runtime we're booting on.
 *
 * Note: `onRequestError` (Next 15 hook) is intentionally NOT re-exported —
 * it doesn't exist in @sentry/nextjs 8.x and is not required for Next 14.
 * Errors in Server Components / Server Actions / Route Handlers are captured
 * automatically by the Sentry init in sentry.server.config.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
