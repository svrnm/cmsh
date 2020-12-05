class BaseFileSystem {
  // Default implementation of "get" for mounted
  // file systems
  // Since this FS is "mounted", we can assume that
  // path is resolved already
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

  async create(path, pointer = false) {
    console.log('Unimplemented', this, 'create')
  }

  async open(path, mode = 'append') {
    console.log('Unimplemented', this, 'open')
  }

  async _getFiles() {
    console.log('Unimplemented', this, '_getFiles')
  }


  async has(path) {
    return (await this.get(path)) === false ? false : true
  }

  resolvePath(path) {
    const fullPath = ['']
    let parts = path.split('/')

    parts.forEach(p => {
      if (p === '' || p === '.') {
        return
      }
      if (p === '..') {
        if (fullPath.length > 1) {
          fullPath.pop()
        }
        return
      }
      fullPath.push(p)
    })
    return fullPath.length === 1 ? '/' : fullPath.join('/')
  }


  _createFileSystem(files, cb = () => {}) {
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
            } else {
              cb(result, key, value)
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
    return Object.keys(files).reduce(walk(files), {})
  }


}

export default BaseFileSystem
