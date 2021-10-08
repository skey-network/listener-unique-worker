const CODE_OK = 1
const CODE_ERROR = 2

class TestSpanContext {
  constructor(traceId: string, spanId: string) {}
}

class SpanWrapper {
  constructor(span: any) {}

  endWithError(message: string) {}
  endWithSuccess(message?: string) {}
  event(message: string) {}
}

class Tracing {
  public static get instance() {
    return undefined
  }

  private constructor() {}

  setup() {}

  static toHexString(byteArray: Uint8Array) {}
  //docker run --network host otel/opentelemetry-collector

  createSpanFromTx(txid: string | Uint8Array, additionalContent?: string) {}
}

export { Tracing, SpanWrapper }
