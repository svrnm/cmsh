import Environment from './Environment.js'
import FileSystem from './FileSystem.js'
import RemoteFile from './RemoteFile.js'
import Io from './Io.js'
import Line from './Line.js'
import baseFs from '../fs/base.js'

class Shell {
  constructor(process, env, baseFs, io = Io.none()) {
    this.process = process
    this.inProcess = false
    this.sigIntReceived = false
    this.environment = new Environment(env, this)
    this.fileSystem = new FileSystem(baseFs, this.environment, this)
    this.io = io
  }

  static async start(process, env, fileSystems = {}) {
    const shell = new Shell(process, Object.assign({
      '?': 0,
      'PWD': env.HOME || '/',
      PATH: '/bin/:/usr/bin/:/usr/local/bin'
    }, env), baseFs, new Io(
      process,
      process,
      process
    ))

    if(typeof fileSystems === 'function') {
      fileSystems = fileSystems((remotePath) => {
        return new RemoteFile(process, remotePath)
      })
    }

    Object.keys(fileSystems).forEach(mountPoint => {
      shell.mount(fileSystems[mountPoint], mountPoint)
    })

    shell.chmod('/', '-w')

    const rl = await process.run(shell)

    shell.execute('cat /etc/motd').then(r => {

      rl.setPrompt(shell.getPrompt())

      rl.on('line', (line) => {
        if (shell.inProcess) {
          return
        }
        shell.execute(line).then(result => {
          shell.setenv('?', result)
          rl.setPrompt(shell.getPrompt())
          rl.prompt()
        })
      })

      rl.prompt()
    })

    return shell
  }

  exit() {
    console.log('Goodbye.')
    this.process.exit()
  }

  clear() {
    this.io.clear()
  }

  completer(line) {
    const args = line.split(' ')
    // Only one arg so we expand commands
    if(args.length === 1) {
        const hits = Object.keys(this.getExecutablesInPath()).filter(e => e.startsWith(line))
        return [hits, line]
    } else {
    // expand on path
    const path = args.pop()
    const pwd = this.getenv('PWD') + '/'
    const parts = ((path.startsWith('/') ? '' : pwd) + path).split('/')
    const file = parts.pop()

    const directory = this.fileSystem.get(parts.join('/'), true)
    const hits = Object.keys(directory.children).filter(e => e.startsWith(file)).map(hit => {
        let v = parts.join('/') + '/' + hit
        if(v.startsWith(pwd)) {
          v = v.substr(pwd.length)
        }
        return args.join(' ') + ' ' + v
      })
      return [hits, line]
    }
  }

  trap(signal) {
    console.log('Signal ', signal, ' received.')
    if(signal == 'SIGINT') {
      if (this.inProcess) {
        this.sigIntReceived = true
      } else {
        this.exit()
      }
    }
  }

  chmod(path, mode) {
    return this.fileSystem.chmod(path, mode)
  }

  mount(files, mountPoint = '/mnt') {
    return this.fileSystem.mount(files, mountPoint)
  }

  getPrompt() {
    const dir = this.getenv('PWD') === this.getenv('HOME') ? '~' : this.getenv('PWD')
    return this.hasenv('PS1') ? this.getenv('PS1').replace('\\u', this.getenv('USER')).replace('\\h', this.getenv('HOSTNAME')).replace('\\w', dir) : '$'
  }

  getPath(path = '') {
    if (path.indexOf('/') != 0) {
      path = this.getenv('PWD') + '/' + path
    }
    return this.fileSystem.get(path)
  }

  createFile(path) {
    if (path.indexOf('/') != 0) {
      path = this.getenv('PWD') + '/' + path
    }
    return this.fileSystem.create(path)
  }

  openFile(path) {
    if (path.indexOf('/') != 0) {
      path = this.getenv('PWD') + '/' + path
    }
    return this.fileSystem.open(path)
  }

  hasenv(key) {
    return this.environment.has(key)
  }

  setenv(key, value) {
    this.environment.set(key, value)
  }

  getenv(key) {
    return this.environment.get(key)
  }

  applyenv(str) {
    return this.environment.applyOnString(str)
  }

  getExecutablesInPath() {
    const executables = this.environment.get('PATH').split(':').reduce((result, path) => {
      const files = this.fileSystem.get(path).children
      if (!files) {
        return result
      }
      return Object.assign({}, result, Object.keys(files).reduce((result, file) => {
        if (files[file].executable) {
          result[file] = files[file]
        }
        return result
      }, {}))
    }, {})

    executables.exit = {
      executable: true,
      content: () => {
        this.exit()
      }
    }

    executables.clear = {
      executable: true,
      content: () => this.clear()
    }

    return executables
  }

  in() {
    return new Promise((resolve, reject) => {
      resolve()
    })
  }

  out(str) {
    this.io.writeLine(str)
  }

  err(str) {
    this.io.writeErrorLine(str)
  }

  async interruptible(fnc) {
    return new Promise((resolve, reject) => {
      this.inProcess = true
      const generator = fnc()
      const f = async () => {
        if (this.sigIntReceived) {
          this.inProcess = false
          this.sigIntReceived = false
          resolve(1)
          return
        }
        const next = generator.next()
        await next.value
        if (next.done) {
          this.inProcess = false
          resolve(next.value)
          return
        }
        setTimeout(f)
      }
      setTimeout(f)
    })
  }

  buildIo(cmd, redirections) {
    let outHandles = []
    let inHandles = []

    outHandles = redirections.filter(r => r.mode !== 'read').map(redirection => {
      return this.openFile(redirection.target, redirection.mode)
    })
    inHandles = redirections.filter(r => r.mode === 'read').map(redirection => {
      return this.openFile(redirection.target, redirection.mode)
    })

    const process = this.process

    const writer = outHandles.length > 0 ? {
      writeLine: function() {
        let data = Array.from(arguments).join(' ')
        outHandles.forEach(fh => {
          if (fh.mode === 'error') {
            // we don't have error redirection yetec
            process.writeErrorLine(`${cmd}: ${fh.error}`)
            return
          }
          fh.write(data)
        })
      }
    } : this.process

    const reader = inHandles.length > 0 ? {
      readAll: function() {
        return Promise.all(inHandles.map(fh => {
          return fh.read()
        })).then(results => {
          return results.join('\n')
        })
      }
    } : this.process

    return new Io(
      reader,
      writer,
      this.process,
      () => {
        outHandles.forEach(fh => fh.close())
      }
    )
  }

  async execute(value) {
    return new Promise(async (resolve, reject) => {

      this.process.hold()

      const line = Line.build(value, this.environment)

      if (line.args.length === 0) {
        Object.keys(line.variables).forEach(key => this.setenv(key, line.variables[key].value))
        resolve()
        return
      }

      const input = line.args.shift()

      const executables = this.getExecutablesInPath()

      if (!executables[input]) {
        this.out(`Command not found: ${input}`)

        this.process.release()

        resolve(127)
        return
      }

      const io = line.redirections.length > 0 ? this.buildIo(input, line.redirections) : this.io

      const result = await executables[input].content(line.args, this, io)

      this.process.release()
      io.release()

      resolve(result)
    })
  }
}

export default Shell
