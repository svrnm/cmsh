import BaseFileSystem from './BaseFileSystem.js'
import FileHandle from '../FileHandle.js'

class WebStorageFileHandle  {
  constructor(fs, fh) {
    this.fs = fs
    this.fh = fh
  }

  toString() {
    return this.fh.toString()
  }

  read(data) {
    return this.fh.read(data)
  }

  write(data) {
    const r = this.fh.write(data)
    this.fs._sync()
    return r
  }

  close() {
    const r = this.fh.close()
    this.fs._sync()
    return r
  }
}

class WebStorageFileSystem extends BaseFileSystem {
  constructor(storage, options) {
    super()
    this.storage = storage
    this.files = JSON.parse(localStorage.getItem('files')) || this._createFileSystem(
      {
        '/': {
          writeable: true,
          children: {}
        }
      }
    )
  }

  async create(path, pointer = false) {
    return await this._createFromObject(path, {
      type: 'file',
      writeable: true,
      content: ''
    }, pointer)
  }

  async open(path, mode = 'append') {
    let file = await this.get(path, true)
    if (!file) {
      file = await this.create(path, true)
      if (!file) {
        return new WebStorageFileHandle(this, new FileHandle(file, 'error', `permission denied: ${path.split('/').pop()}`))
      }
    }
    return new WebStorageFileHandle(this, new FileHandle(file, mode))
  }

  _sync() {
    localStorage.setItem('files', JSON.stringify(this.files))
  }

  async _createFromObject(path, what, pointer) {
    const parts = path.split('/')
    const file = parts.pop()
    console.log(parts)
    const directory = await this.get(parts.join('/'), true)
    console.log(directory)
    if (typeof directory.writeable !== 'boolean' || directory.writeable !== true) {
      return false
    }
    if (!directory.children[file]) {
      directory.children[file] = what
      return this.get(path, pointer)
    }
    return false
  }

  async _getFiles() {
    return this.files
  }
}

export default WebStorageFileSystem
