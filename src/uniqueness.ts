import ActionParams from './action_params'

/**
 *  checks if tx is unique in given time range
 *  groups txes by date of creation to minimize checks count
 *  automaticaly rejects txes outside time window
 *  removes outdated groups
 */
class Uniqueness {
  groupWindowSize = 1000 // 1s
  actionMaxValidTime = 12000 // 12sek

  groups: { timeIndex: number; txes: string[] }[] = []

  checkItemUniqueness(data: ActionParams) {
    if (!this.isItemInRange(data)) {
      // console.log('not in range')
      return false
    }
    let group = this.findGroup(data.timestamp)
    if (!this.isItemUniqueInGroup(group, data)) {
      // console.log('found in group')
      return false
    }

    group ??= this.cleanOldGroups() ?? this.createGroup(this.timeIndex(data.timestamp))
    group!.txes.push(data.tx)
    return true
  }

  protected isItemInRange(data: ActionParams) {
    if (data.timestamp < Date.now() - this.actionMaxValidTime) return false
    // TODO add validTo here
    return true
  }

  protected isItemUniqueInGroup(
    group: { timeIndex: number; txes: string[] } | undefined,
    data: ActionParams
  ) {
    // returns true if there is no group or no element in group
    return (group?.txes?.indexOf(data.tx) ?? -1) == -1
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
