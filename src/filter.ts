import ActionParams from './action_params'
import Consumer from './queue/consumer'
import { Producer } from './queue/producer'
import ActionParamsAdapter from './uniqueness/action_params_adapter'
import Uniqueness from './uniqueness/uniqueness'

class Filter {
  uniqueness: Uniqueness<ActionParams>
  consumer: Consumer
  producer: Producer

  constructor() {
    this.consumer = new Consumer((data) => {
      this.processNew(data)
    })
    this.producer = new Producer()
    this.uniqueness = new Uniqueness(new ActionParamsAdapter())
  }

  processNew(data: ActionParams) {
    if (!this.uniqueness.checkItemUniqueness(data)) return
    this.pushUnique(data)
  }

  pushUnique(data: ActionParams) {
    this.producer.pushToQueue(data)
  }
}
export default Filter
