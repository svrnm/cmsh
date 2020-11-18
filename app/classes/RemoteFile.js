class RemoteFile {
  constructor(path) {
    this.path = path
  }

  toString() {
    return this.path
  }

  fetch() {
    return fetch(this.path).then(resp => {
      console.log(resp)
      return resp.text()
    })
  }
}

export default RemoteFile;
