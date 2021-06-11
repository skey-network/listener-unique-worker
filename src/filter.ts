import ActionParams from './action_params'
import Consumer from './queue/consumer'
import { Producer } from './queue/producer'
import Uniqueness from './uniqueness'

class Filter {
  uniqueness: Uniqueness
  consumer: Consumer
  producer: Producer

  cleanUpCounter: number = 0

  constructor() {
    this.consumer = new Consumer((data) => {
      this.processNew(data)
    })
    this.producer = new Producer()
    this.uniqueness = new Uniqueness()
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
