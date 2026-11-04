import type {
  ProviderConnectionConfig,
  ProviderEnvironment,
} from "../../types";

export type DarajaConfigResult =
  | { ok: true; config: ProviderConnectionConfig }
  | { ok: false; error: string };

export function readDarajaConfig(
  env: NodeJS.ProcessEnv = process.env,
): DarajaConfigResult {
  const environment = env.MPESA_ENVIRONMENT;

  // This foundation intentionally supports sandbox only. Production activation
  // requires a separately reviewed configuration and release.
  if (environment !== "sandbox") {
    return {
      ok: false,
      error: "M-Pesa environment must be set to sandbox for this connection check.",
    };
  }

  const consumerKey = env.MPESA_CONSUMER_KEY;
  const consumerSecret = env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    return {
      ok: false,
      error: "Daraja Consumer Key or Consumer Secret is not configured.",
    };
  }

  return {
    ok: true,
    config: {
      environment: environment as ProviderEnvironment,
      credentials: { consumerKey, consumerSecret },
    },
  };
}
