import BaseFileSystem from './BaseFileSystem.js'
import FileHandle from '../FileHandle.js'

class TmpFileSystem extends BaseFileSystem {
  constructor() {
    super()
    this.files = this._createFileSystem(
      {
        '/': {
          writeable: true,
          children: {}
        }
      }
    )
  }

  async open(path, mode = 'append') {
    let file = await this.get(path, true)
    if (!file) {
      file = await this.create(path, true)
      if (!file) {
        return new FileHandle(file, 'error', `permission denied: ${path.split('/').pop()}`)
      }
    }
    return new FileHandle(file, mode)
  }

  async create(path, pointer = false) {
    return await this._createFromObject(path, {
      type: 'file',
      writeable: true,
      content: ''
    }, pointer)
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

export default TmpFileSystem
