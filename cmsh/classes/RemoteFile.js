class RemoteFile {
  constructor(process, path) {
    this.process = process
    this.path = path
  }

  toString() {
    return this.path
  }

  async fetch() {
    const data = await this.process.fetch(this.path)
    return data
  }
}

export default RemoteFile;
