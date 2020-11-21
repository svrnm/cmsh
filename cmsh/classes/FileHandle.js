import RemoteFile from './RemoteFile.js'

class FileHandle {
  constructor(file, mode = 'append', error = '') {
    this.file = file
    this.mode = mode
    this.written = false
    this.closed = mode === 'error'
    this.error = error
  }

  toString() {
    return this.file
  }

  read(data) {
    return new Promise((resolve, reject) => {
      if(this.mode === 'error') {
        reject(this.error)
        return
      }
      if(this.file.content instanceof RemoteFile) {
        this.file.content.fetch().then(content => {
          resolve(content)
        }).catch(error => {
          reject(error)
        })
        return
      }
      resolve(this.file.content)
    })
  }

  write(data) {
    if (this.closed || this.mode === 'read') {
      return 1
    }
    if (!this.written && this.mode === 'overwrite') {
      this.file.content = ''
    }
    this.file.content += data
    return 0
  }

  close() {
    if (this.closed) {
      return 1
    }
    this.file.content += '\n'
    this.closed = true
  }
}

export default FileHandle;
