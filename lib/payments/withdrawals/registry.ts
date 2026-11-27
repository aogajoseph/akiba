import type {
  WithdrawalProviderAdapter,
  WithdrawalProviderRegistry,
} from "./types";
import type { ProviderEnvironment } from "../types";

/**
 * Immutable registry keyed by provider code and environment. Registering the
 * same key twice is a startup/configuration error rather than last-write-wins.
 */
export function createWithdrawalProviderRegistry(
  adapters: readonly WithdrawalProviderAdapter[],
): WithdrawalProviderRegistry {
  const byKey = new Map<string, WithdrawalProviderAdapter>();

  for (const adapter of adapters) {
    const key = adapter.providerCode + ":" + adapter.environment;
    if (byKey.has(key)) {
      throw new Error("Duplicate withdrawal provider adapter registration: " + key);
    }
    byKey.set(key, adapter);
  }

  return Object.freeze({
    get(providerCode: string, environment: ProviderEnvironment) {
      return byKey.get(providerCode + ":" + environment) ?? null;
    },
  });
}
