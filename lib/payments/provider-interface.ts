import type {
  ProviderCallbackVerification,
  ProviderCapabilities,
  ProviderCollectionRequest,
  ProviderCollectionResult,
  ProviderCollectionStatusResult,
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

  // Optional operations are implemented only when the adapter has been
  // integrated, tested and explicitly enabled for that capability.
  createCollection?(
    request: ProviderCollectionRequest,
    config: ProviderConnectionConfig,
  ): Promise<ProviderCollectionResult>;
  queryCollection?(
    requestReference: string,
    config: ProviderConnectionConfig,
  ): Promise<ProviderCollectionStatusResult>;
  verifyCallback?(
    rawBody: string,
    headers: Readonly<Record<string, string>>,
    config: ProviderConnectionConfig,
  ): Promise<ProviderCallbackVerification>;
}
