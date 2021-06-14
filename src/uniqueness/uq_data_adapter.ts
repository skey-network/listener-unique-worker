interface UqDataAdapter<dataType> {
  getTimestamp(data: dataType): number
  getUniqueId(data: dataType): string
}
export default UqDataAdapter
