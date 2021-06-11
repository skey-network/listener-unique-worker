import RedisSMQ from 'rsmq'
import ActionParams from '../action_params'
import { SpanWrapper } from '../tracing'
import { RedisConnection, RedisConnectionOptions } from './redis_connection'

type ProducerPushFnType = (params: ActionParams, span?: SpanWrapper) => void

class Producer {
  rsmq: RedisSMQ
  constructor(options?: RedisConnectionOptions) {
    this.rsmq = new RedisSMQ({
      client: RedisConnection.CreateClient(options ?? {}),
      ns: 'listener'
    })
  }

  /** pushes parsed transaction to queue */
  pushToQueue(params: ActionParams, span?: SpanWrapper) {
    const payload = JSON.stringify(params)
    this.rsmq.sendMessage({ message: payload, qname: 'uq-txes' }, (x) => {
      // console.log(x)
    })
  }
}

export { Producer, ProducerPushFnType }
