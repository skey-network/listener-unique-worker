import RedisSMQ from 'rsmq'
import ActionParams from '../action_params'
import { SpanWrapper } from '../tracing'

type ProducerPushFnType = (params: ActionParams, span?: SpanWrapper) => void

class Producer {
  rsmq: RedisSMQ
  constructor() {
    this.rsmq = new RedisSMQ({ host: '127.0.0.1', port: 6379, ns: 'listener' })
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
