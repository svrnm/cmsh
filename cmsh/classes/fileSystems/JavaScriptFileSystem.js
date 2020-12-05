import BaseFileSystem from './BaseFileSystem.js'
import FileHandle from '../FileHandle.js'

class JavaScriptFileSystem extends BaseFileSystem {
  constructor(fileName, options) {
    super()
    this.files = false
    this.module = import(`../../fs/${fileName}`)
  }

  async _getFiles() {
    if(!this.files) {
      this.files = this._createFileSystem(
        (await this.module).default
      )
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
    return new FileHandle(file, mode)
  }
}

export default JavaScriptFileSystem
