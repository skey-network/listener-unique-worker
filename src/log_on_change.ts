class LogOnChange {
  static watched: { key: string; val: string }[] = []

  static watchChange(key: string, val: any) {
    const item = this.watched.find((x) => x.key == key)
    if (!item) {
      this.watched.push({ key, val: JSON.stringify(val) })
      console.log({ key, val })
    } else {
      if (item.val != JSON.stringify(val)) {
        item.val = JSON.stringify(val)
        console.log({ key, val })
      }
    }
  }
}

export default LogOnChange
