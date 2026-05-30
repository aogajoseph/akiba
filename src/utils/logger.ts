type LogPayload = Record<string, unknown>;

export const logStructuredEvent = (event: string, payload: LogPayload = {}): void => {
  console.log(`[invite] ${JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  })}`);
};
