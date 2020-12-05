import BaseFileSystem from './BaseFileSystem.js'
import FileHandle from '../FileHandle.js'

class HttpFileHandle {
  constructor(fs, file) {
    this.fs = fs
    this.file = file
  }

  toString() {
    return this.file
  }

  read(data) {
    return new Promise((resolve, reject) => {
      fetch(`${this.fs.remoteLocation}${this.file}`).then(response => {
        return response.text()
      }).then(text => {
        resolve(text)
      })
    })
  }

  write(data) {
    // TODO: Implement write to HTTP Server
    return 1
  }

  close() {
    // TODO: Implement write to HTTP Server
  }
}

class HttpFileSystem extends BaseFileSystem {
  constructor(remoteLocation, options) {
    super()
    this.files = false
    this.remoteLocation = remoteLocation
    this.remoteIndex = fetch(`${remoteLocation}/_index.json`)
  }

  async _getFiles() {
    if(!this.files) {
      const response = await this.remoteIndex
      const json = await response.json()
      this.files = this._createFileSystem(json, (result, key, value) => {
        return result[key] = (path) => {
          return new HttpFileHandle(this, path)
        }
      })
    }
    return this.files
  }

  async open(path, mode = 'append') {
    let file = await this.get(path, true)
    if (!file) {
      file = this.create(path, true)
      if (!file) {
        return new FileHandle(file, 'error', `permission denied: ${path.split('/').pop()}`)
      }
    }
    const fh = file(path)

    return fh;
  }

  async get(path, pointer = false) {
    const fs = await this._getFiles()
    let position = fs['/']
    let parts = path.split('/')

    const notfound = parts.some(p => {
      if (p === '') {
        return false
      }
      if (position.type === 'directory' && position.children[p]) {
        position = position.children[p]
        return false
      }
      position = false
      return true
    })

    if (notfound) {
      return false
    }

    if (pointer) {
      return position
    }

    return Object.assign({}, position, {
      fullPath: path,
      basename: parts.pop()
    })
  }
}

export default HttpFileSystem
