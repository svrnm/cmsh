class Io {
  constructor(reader, writer, errorWriter = writer, releaseCallback = () => {}) {
    this.reader = reader
    this.writer = writer
    this.errorWriter = errorWriter
    this.releaseCallback = releaseCallback
  }

  clear() {
    this.writer.clear()
  }

  writeLine(line) {
    this.writer.writeLine(line)
  }

  writeChar(char) {
    this.writer.writeChar(char)
  }

  writeErrorLine(line) {
    this.errorWriter.writeLine(line)
  }

  async readAll() {
    return await this.reader.readAll()
  }

  async readChar() {
    return await this.reader.readChar()
  }

  release() {
    this.releaseCallback()
  }
}

export default Io
