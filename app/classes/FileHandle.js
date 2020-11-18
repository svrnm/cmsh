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

  write(data) {
    if (this.closed) {
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
