import { BatchSpanProcessor, Span } from '@opentelemetry/tracing'
import {
  context,
  trace,
  SpanContext,
  TraceState,
  SpanKind,
  Tracer,
  diag,
  DiagConsoleLogger,
  DiagLogLevel
} from '@opentelemetry/api'
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks'
import { NodeTracerProvider } from '@opentelemetry/node'
import * as Crypto from '@waves/ts-lib-crypto'
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector'

const CODE_OK = 1
const CODE_ERROR = 2

class TestSpanContext implements SpanContext {
  traceId: string
  spanId: string
  isRemote?: boolean | undefined
  traceFlags: number
  traceState?: TraceState | undefined

  constructor(traceId: string, spanId: string) {
    this.traceId = traceId
    this.spanId = spanId //traceId.slice(0, 16)
    this.traceFlags = 1
  }
}

class SpanWrapper {
  span: Span
  constructor(span: Span) {
    this.span = span
  }

  endWithError(message: string) {
    this.span.setStatus({ code: CODE_ERROR, message: message })
    this.span.end()
  }
  endWithSuccess(message?: string) {
    this.span.setStatus({ code: CODE_OK, message: message })
    this.span.end()
  }
  event(message: string) {
    this.span.addEvent(message)
  }
}

class Tracing {
  protected static inst: Tracing
  protected enabled: boolean = false

  public static get instance(): Tracing {
    return this.inst || (this.inst = new Tracing())
  }

  //instance: Tracing = new Tracing()
  protected tracer!: Tracer
  private constructor() {
    this.setup()
  }

  setup() {
    if (!process.env.TRACE) {
      console.log('Tracing disabled, url not specified')
      this.enabled = false
      return
    }

    // set global context manager
    context.setGlobalContextManager(new AsyncHooksContextManager())
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR)

    // Create a provider for activating and tracking spans
    const tracerProvider = new NodeTracerProvider()
    // Register the tracer
    tracerProvider.register()

    // exporter
    const exporter = new CollectorTraceExporter({
      serviceName: process.env.SERVICE_NAME,
      headers: {
        // 'Lightstep-Access-Token': process.env.LIGHTSTEP_TOKEN
      },
      url: process.env.TRACE
    })

    // tracerProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
    tracerProvider.addSpanProcessor(new BatchSpanProcessor(exporter))
    console.log('Tracing initialized')
    this.enabled = true
    // Get a tracer
    this.tracer = trace.getTracer('listener')
  }

  static toHexString(byteArray: Uint8Array) {
    return Array.from(byteArray, function (byte) {
      return ('0' + (byte & 0xff).toString(16)).slice(-2)
    }).join('')
  }
  //docker run --network host otel/opentelemetry-collector

  createSpanFromTx(txid: string | Uint8Array, additionalContent?: string) {
    if (!this.enabled) return undefined
    const txidBytes = txid instanceof Uint8Array ? txid : Crypto.base58Decode(txid)
    const SpanTraceId = Tracing.toHexString(txidBytes.slice(0, 16))
    // const ParentTraceId = Tracing.toHexString(txidBytes.slice(16, 32))

    const testSpanContext = new TestSpanContext(
      SpanTraceId,
      Tracing.toHexString(Crypto.randomBytes(8))
    )

    const span = new Span(
      this.tracer as any,
      context.active(),
      (txid instanceof Uint8Array ? Crypto.base58Encode(txid) : txid) +
        (additionalContent ? ' ' + additionalContent : ''),
      testSpanContext,
      SpanKind.CLIENT
      // ParentTraceId
    )
    return new SpanWrapper(span)
  }
}

export { Tracing, SpanWrapper }
