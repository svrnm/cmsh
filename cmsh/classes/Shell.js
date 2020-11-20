import Environment from './Environment.js'
import FileSystem from './FileSystem.js'
import RemoteFile from './RemoteFile.js'
import buildCmdLine from '../functions/buildCmdLine.js'
import baseFs from '../fs/base.js'

class Shell {
  constructor(process, env, baseFs) {
    this.process = process
    this.inProcess = false
    this.sigIntReceived = false
    this.environment = new Environment(env, this)
    this.fileSystem = new FileSystem(baseFs, this.environment, this)
  }

  static async start(process, env, fileSystems = {}) {
    const shell = new Shell(process, Object.assign({
      '?': 0,
      'PWD': env.HOME || '/',
      PATH: '/bin/:/usr/bin/:/usr/local/bin'
    }, env), baseFs)

    if(typeof fileSystems === 'function') {
      fileSystems = fileSystems((remotePath) => {
        return new RemoteFile(remotePath)
      })
    }

    Object.keys(fileSystems).forEach(mountPoint => {
      shell.mount(fileSystems[mountPoint], mountPoint)
    })

    shell.chmod('/', '-w')

    /*if (scope.document) {
      shell.browser(scope)
    } else {
      shell.readLine(process, scope)
    }*/

    /*(await process.run()).on(line => {
      console.log(line)
    })*/

    const rl = await process.run(shell)

    shell.execute('cat /etc/motd').then(r => {
      rl.setPrompt(shell.getPrompt())
      rl.prompt()

      rl.on('line', (line) => {
        console.log('WOOP', line)
        if (shell.inProcess) {
          return
        }
        shell.execute(line).then(result => {
          shell.setenv('?', result)
          rl.setPrompt(shell.getPrompt())
          rl.prompt()
        })
      })
    })

    return shell
  }

  exit() {
    console.log('Goodbye.')
    this.process.exit()
  }

  clear() {
    this.process.clear()
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
    console.log('TRAP')
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

  find(key) {

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



  browserOld(window) {

    let ctrlDown = false

    const history = [

    ]

    let historyPointer = 0

    const document = window.document

    const [promptContainer, promptInput, promptStatement, output] = ['prompt-container', 'prompt-input', 'prompt-statement', 'output'].map(e => document.getElementById(e));

    /* Optimize input for mobile */
    //promptInput.setAttribute('autocomplete', 'off')
    promptInput.setAttribute('role', 'presentation')
    promptInput.focus()
    const updateFromHash = () => {
      promptInput.value = decodeURIComponent(document.location.hash.substr(1))
      if(promptInput.value.endsWith('⏎')) {
        promptInput.value = promptInput.value.substr(1)
      }
    }
    updateFromHash()
    window.onhashchange = () => {
      updateFromHash()
    }

    /* Do not submit form on enter */
    promptContainer.addEventListener('submit', event => {
      event.preventDefault()
    })

    document.addEventListener('focusout', function() {
      promptInput.focus()
    }, true);




    promptStatement.innerHTML = this.getPrompt() + ''

    this.focus = () => {
      promptInput.focus()
      window.scrollTo(0, window.document.body.scrollHeight);
    }


    this.console = {
      log: function() {
        output.innerHTML += `<div>${Array.from(arguments).join(' ').replaceAll('\n', '<br>')}</div>`
        console.log.apply(console, arguments);
      },
      error: function() {
        console.error.apply(console, arguments);
        output.innerHTML += `<div>${Array.from(arguments).join(' ').replaceAll('\n', '<br>')}</div>`
      },
      clear: function() {
        output.innerHTML = ''
      }
    }

    Object.keys(this.getExecutablesInPath()).forEach(e => {
      /*const option = document.createElement("option")
      option.setAttribute('value', e)
      completer.appendChild(option)*/
    })

    this.execute('cat /etc/motd').then(r => {
      document.addEventListener('keydown', event => {
        console.log('DOWN', event.keyCode);
        if (event.keyCode === 17) {
          ctrlDown = true
        }
      })
      document.addEventListener('keyup', event => {
        console.log('UP', event.keyCode);
        if (event.keyCode === 27 || (event.keyCode === 67 && ctrlDown)) {
          console.log("SIGINT")
          if (this.inProcess) {
            this.sigIntReceived = true
          }
        }
        // Introduce some extra checks that the cursor is at the end of the input
        if (event.keyCode === 38 || event.keyCode === 40) {
          if (event.keyCode === 38) {
            // UP
            historyPointer = historyPointer > 0 ? historyPointer - 1 : 0
          } else if (event.keyCode === 40) {
            // DOWN
            historyPointer = historyPointer < history.length - 1 ? historyPointer + 1 : history.length - 1
          }
          promptInput.value = history[historyPointer]
        }
        if (event.keyCode === 13) {
          const line = promptInput.value
          promptInput.value = ''
          event.preventDefault()
          if (this.inProcess) {
            return
          }
          hints.innerHTML = ''
          console.log(line)
          output.innerHTML += `<div class="old-prompt"><span class="old-prompt-statement">${this.getPrompt()}</span><input disabled class="old-prompt-input" value="${line}" /></div>`
          promptStatement.style.display = 'none';
          this.execute(line).then(result => {
            this.setenv('?', result)
            history.push(line)
            historyPointer = history.length
            promptStatement.innerHTML = this.getPrompt()
            promptStatement.style.display = 'block';
            promptInput.focus()
          })
        }
      })
    })
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


  getRows() {
    return process.stdout.rows
  }

  in() {
    return new Promise((resolve, reject) => {
      resolve()
    })
  }

  out(str) {
    this.process.log(str)
  }

  err(str) {
    this.console.error(str)
  }

  interruptible(fnc) {
    return new Promise((resolve, reject) => {
      this.inProcess = true
      const generator = fnc()
      const f = () => {
        if (this.sigIntReceived) {
          this.inProcess = false
          this.sigIntReceived = false
          resolve(1)
          return
        }
        const next = generator.next()
        if(next instanceof Promise) {
          next().then((value, done) => {
            if (done) {
              this.inProcess = false
              resolve(value)
              return
            }
            setImmediate(f)
          })
        }
        const { value, done } = next
        if (done) {
          this.inProcess = false
          resolve(value)
          return
        }
        setImmediate(f)
      }
      setImmediate(f)
    })
  }

  execute(value) {
    return new Promise((resolve, reject) => {

      const {
        variables,
        args,
        redirections
      } = buildCmdLine(value, this.environment)

      console.log('?', variables, args, redirections)

      if (args.length === 0) {
        Object.keys(variables).forEach(key => this.setenv(key, variables[key].value))
        resolve()
        return
      }

      const input = args.shift()

      const executables = this.getExecutablesInPath()

      if (!executables[input]) {
        this.out(`Command not found: ${input}`)
        resolve(127)
        return
      }

      let inFn = this.in.bind(this)
      let out = this.out.bind(this)
      let err = this.err.bind(this)
      let outHandles = []
      let inHandles = []

      if (redirections.length > 0) {
        outHandles = redirections.filter(r => r.mode !== 'read').map(redirection => {
          return this.openFile(redirection.target, redirection.mode)
        })
        inHandles = redirections.filter(r => r.mode === 'read').map(redirection => {
          return this.openFile(redirection.target, redirection.mode)
        })
        if(inHandles.length > 0) {
        inFn = () => {
            return Promise.all(inHandles.map(fh => {
              return fh.read()
            })).then(results => {
              return results.join('\n')
            })
          }
        }
        if(outHandles.length > 0) {
          out = (str) => {
            outHandles.forEach(fh => {
              if (fh.mode === 'error') {
                this.err(`${input}: ${fh.error}`)
                return
              }
              fh.write(str)
            })
          }
        }
      }

      const result = executables[input].content(args, this, out, err, inFn)

      if (result instanceof Promise) {
        result.then(r => {
          outHandles.forEach(fh => fh.close())
          resolve(r)
        })
      } else {
        outHandles.forEach(fh => fh.close())
        resolve(result)
      }
    })
  }
}

export default Shell
