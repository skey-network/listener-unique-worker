import UqDataAdapter from './uq_data_adapter'
/**
 *  checks if tx is unique in given time range
 *  groups txes by date of creation to minimize checks count
 *  automaticaly rejects txes outside time window
 *  removes outdated groups
 */
class Uniqueness<dataType> {
  groupWindowSize = 1000 // 1s
  actionMaxValidTime = 120 * 1000 // 2min
  adapter: UqDataAdapter<dataType>

  groups: { timeIndex: number; txes: string[] }[] = []

  constructor(
    adapter: UqDataAdapter<dataType>,
    config?: { groupWindowSize?: number; actionMaxValidTime?: number }
  ) {
    this.groupWindowSize = config?.groupWindowSize ?? this.groupWindowSize
    this.actionMaxValidTime = config?.actionMaxValidTime ?? this.actionMaxValidTime
    this.adapter = adapter
  }

  checkItemUniqueness(data: dataType) {
    if (!this.isItemInRange(data)) {
      // console.log('not in range')
      return false
    }
    let group = this.findGroup(this.adapter.getTimestamp(data))
    if (!this.isItemUniqueInGroup(group, data)) {
      // console.log('found in group')
      return false
    }

    group ??=
      this.cleanOldGroups() ??
      this.createGroup(this.timeIndex(this.adapter.getTimestamp(data)))
    group!.txes.push(this.adapter.getUniqueId(data))
    return true
  }

  protected isItemInRange(data: dataType) {
    if (this.adapter.getTimestamp(data) < Date.now() - this.actionMaxValidTime) {
      return false
    }
    return true
  }

  protected isItemUniqueInGroup(
    group: { timeIndex: number; txes: string[] } | undefined,
    data: dataType
  ) {
    // returns true if there is no group or no element in group
    return (group?.txes?.indexOf(this.adapter.getUniqueId(data)) ?? -1) == -1
  }

  protected findOrCreateGroup(timestamp: number) {
    const timeIndex = this.timeIndex(timestamp)

    return (
      this.groups.find((x) => x.timeIndex == timeIndex) ?? this.createGroup(timeIndex)
    )
  }

  protected createGroup(timeIndex: number) {
    const group = { timeIndex, txes: [] }
    this.groups.push(group)
    return group
  }

  protected cleanOldGroups() {
    let minTimeIndex = this.timeIndex(Date.now() - this.actionMaxValidTime)
    while (this.groups[0] && this.groups[0].timeIndex < minTimeIndex) this.groups.shift()
    console.log(this.groups.map((x) => x.txes.length))
    return null
  }

  protected findGroup(timestamp: number) {
    return this.groups.find((x) => x.timeIndex == this.timeIndex(timestamp))
  }

  protected timeIndex(timestamp: number) {
    return Math.floor(timestamp / this.groupWindowSize)
  }
}

export default Uniqueness
