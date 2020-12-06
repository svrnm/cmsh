import BaseFileSystem from './fileSystems/BaseFileSystem.js'
import JavaScriptFileSystem from './fileSystems/JavaScriptFileSystem.js'
import HttpFileSystem from './fileSystems/HttpFileSystem.js'
import TmpFileSystem from './fileSystems/TmpFileSystem.js'
import WebStorageFileSystem from './fileSystems/WebStorageFileSystem.js'

class FileSystem extends BaseFileSystem {
  constructor(fstab) {
    super()
    this.fstab = fstab
    this.mounts = {}
    fstab.forEach(entry => {
      let fs = null

      if(entry.automount === false) {
        return
      }

      switch(entry.fsType) {
        case "jfs":
          fs =  new JavaScriptFileSystem(entry.deviceSpec, entry.options);
          break;
        case "httpfs":
          fs = new HttpFileSystem(entry.deviceSpec, entry.options);
          break;
        case "wsfs":
          fs = new WebStorageFileSystem(entry.deviceSpec, entry.options);
          break;
        case "tmpfs":
          fs = new TmpFileSystem(entry.deviceSpec, entry.options);
          break;
      }
      if(fs !== null) {
        this.mounts[entry.mountPoint] = fs
      }
    })
  }

  getFstab() {
    return this.fstab.map(e => {
      return `${e.deviceSpec} on ${e.mountPoint} type ${e.fsType} (${e.options})`
    }).join('\n')
  }

  _getMountPoint(fp) {
      return Object.keys(this.mounts).filter(mp => {
        return fp.startsWith(mp)
      }).pop() // TODO: if we have multiple matches we need to take the longest
  }

  _prepare(path) {
    const fp = this.resolvePath(path)
    const mountPoint = this._getMountPoint(fp)
    let innerPath = fp.slice(mountPoint.length)
    if(!innerPath.startsWith('/')) {
      innerPath = '/' + innerPath
    }
    return [fp, mountPoint, innerPath]
  }

  async get(path, pointer = false) {
    const [fp, mountPoint, innerPath] = this._prepare(path)
    const r = await this.mounts[mountPoint].get(innerPath, pointer)
    if(pointer || r === false) {
      return r
    }
    r.fullPath = fp
    return r
  }

  async open(path, mode = 'append') {
      const [fp, mountPoint, innerPath] = this._prepare(path)
      return await this.mounts[mountPoint].open(innerPath, mode)
  }

  async create(path, pointer = false) {
      const [fp, mountPoint, innerPath] = this._prepare(path)
      return await this.mounts[mountPoint].create(innerPath, pointer)
  }

  /*
  _createFileSystem(files) {
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
            if (value instanceof RemoteFile) {
              result[key] = {
                type: 'file',
                writeable: false,
                executable: false,
                content: value
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
    return Object.keys(files).reduce(walk(files), {})
  }

  mount(files, mountPoint = '/mnt') {
    let mp = this.get(mountPoint, true)
    if(!mp) {
      mp = this.createDirectory(mountPoint, true)
    }
    if(!mp) {
      return false
    }
    mp.children = this._createFileSystem(files.children)
    return true
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

  _createFromObject(path, what, pointer) {
    const parts = path.split('/')
    const file = parts.pop()
    const directory = this.get(parts.join('/'), true)
    if (typeof directory.writeable !== 'boolean' || directory.writeable !== true) {
      return false
    }
    if (!directory.children[file]) {
      directory.children[file] = what
      return this.get(path, pointer)
    }
    return false
  }

  createDirectory(path, pointer = false) {
    return this._createFromObject(path, {
      type: 'directory',
      children: {},
      writeable: false
    }, pointer)
  }

  create(path, pointer = false) {
    return this._createFromObject(path, {
      type: 'file',
      writeable: true,
      content: ''
    }, pointer)
  }

  chmod(path, mode) {
    const pointer = this.get(path, true)
    if(!pointer) {
      return false
    }
    if(mode.includes('-w')) {
      pointer.writeable = false
    }
    if(mode.includes('+w')) {
      pointer.writeable = true
    }
  }

  get(path, pointer = false) {
    let position = this.files['/']
    const fullPath = ['']
    let parents = [this.files['/']]
    let parts = path.split('/')

    const notfound = parts.some(p => {
      if (p === '' || p === '.') {
        return false
      }
      if (p === '..') {
        if (fullPath.length > 1) {
          position = parents.pop()
          fullPath.pop()
        }
        return false
      }
      if (position.type === 'directory' && position.children[p]) {
        parents.push(position)
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
  */
}

export default FileSystem
