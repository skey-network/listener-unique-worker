import ActionParams from '../action_params'
import UqDataAdapter from './uq_data_adapter'

class ActionParamsAdapter implements UqDataAdapter<ActionParams> {
  getTimestamp(data: ActionParams): number {
    return data.timestamp
  }
  getUniqueId(data: ActionParams): string {
    return data.tx
  }
}
export default ActionParamsAdapter
