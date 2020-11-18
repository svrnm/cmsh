import FileHandle from './FileHandle'

class FileSystem {
  constructor(files) {
    const walk = (files) => {
      return (result, key) => {
        const value = files[key]
        const type = typeof value
        switch (type) {
          case 'object':
            if (typeof value.children === 'object') {
              result[key] = {
                writeable: value.writeable === true,
                type: 'directory',
                children: Object.keys(value.children).reduce(walk(value.children), {})
              }
            }
            break;
          case 'string':
            result[key] = {
              type: 'file',
              writeable: false,
              executable: false,
              content: value
            }
            break;
          case 'function':
            result[key] = {
              type: 'file',
              writeable: false,
              executable: true,
              content: value
            }
        }
        return result
      }
    }
    this.files = Object.keys(files).reduce(walk(files), {})
  }

  has(path) {
    return this.get(path) === false ? false : true
  }

  open(path, mode = 'append') {
    let file = this.get(path, true)
    if (!file) {
      file = this.create(path, true)
      if (!file) {
        return new FileHandle(file, 'error', `permission denied: ${path.split('/').pop()}`)
      }
    }
    return new FileHandle(file, mode)
  }

  create(path, pointer = false) {
    const parts = path.split('/')
    const file = parts.pop()
    const directory = this.get(parts.join('/'), true)
    if (typeof directory.writeable !== 'boolean' || directory.writeable !== true) {
      return false
    }
    if (!directory.children[file]) {
      directory.children[file] = {
        type: 'file',
        writeable: true,
        content: ''
      }
      return this.get(path, pointer)
    }
  }

  get(path, pointer = false) {
    let position = this.files['/']
    const fullPath = ['']
    let parent = this.files['/']
    let parts = path.split('/')
    const notfound = parts.some(p => {
      if (p === '' || p === '.') {
        return false
      }
      if (p === '..') {
        position = parent
        if (fullPath.length > 1) {
          fullPath.pop()
        }
        return false
      }
      if (position.type === 'directory' && position.children[p]) {
        parent = position
        position = position.children[p]
        fullPath.push(p)
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

    const fp = fullPath.length === 1 ? '/' : fullPath.join('/')

    return Object.assign({}, position, {
      fullPath: fp,
      basename: parts.pop()
    })
  }
}

export default FileSystem
