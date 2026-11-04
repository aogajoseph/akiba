import type {
  ProviderCapabilities,
  ProviderConnectionConfig,
  ProviderConnectionResult,
} from "./types";

export interface PaymentProviderAdapter {
  readonly code: string;
  readonly displayName: string;
  readonly capabilities: Readonly<ProviderCapabilities>;
  checkConnection(
    config: ProviderConnectionConfig,
  ): Promise<ProviderConnectionResult>;
}
