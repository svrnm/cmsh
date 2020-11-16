(function(win) {
  'use strict';

  class Environment {
    constructor(values) {
      this.values = Object.keys(values).reduce((result, key) => {
        result[key] = {
          value: values[key]
        }
        return result
      }, {})
    }

    get(key) {
      return this.values[key].value
    }

    has(key) {
      return typeof this.values[key] === 'object'
    }

    set(key, value) {
      this.values[key] = { value }
    }

    applyOnString(str, localVariables = {}) {
      return str.replace(/\$((\{[^}]*\})|(\S*))/g, (content, matchNoCurly, matchInCurly, y) => {
        if(matchInCurly) {
          const variable = matchInCurly.substr(1, matchInCurly.length-2)
          if (typeof localVariables[variable] === 'object') {
            return localVariables[variable].value
          }
          if (this.has(variable)) {
            return this.get(variable)
          }
        }
        if(matchNoCurly) {
          if (typeof localVariables[matchNoCurly] === 'object') {
            return localVariables[matchNoCurly].value
          }
          if (this.has(matchNoCurly)) {
            return this.get(matchNoCurly)
          }
        }
        return content
    });

    }
  }

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
      if(this.closed) {
        return 1
      }
      if(!this.written && this.mode === 'overwrite') {
        this.file.content = ''
      }
      this.file.content += data
      return 0
    }

    close() {
      if(this.closed) {
        return 1
      }
      this.file.content += '\n'
      this.closed = true
    }
  }

  class FileSystem {
    constructor(files) {
      const walk = (files) => {
        return (result, key) => {
          const value = files[key]
          const type = typeof value
          switch(type) {
            case 'object':
              if(typeof value.children === 'object') {
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
      if(!file) {
        file = this.create(path, true)
        if(!file) {
          return new FileHandle(file, 'error', `permission denied: ${path.split('/').pop()}`)
        }
      }
      return new FileHandle(file, mode)
    }

    create(path, pointer = false) {
      const parts = path.split('/')
      const file = parts.pop()
      const directory = this.get(parts.join('/'), true)
      if(typeof directory.writeable !== 'boolean' || directory.writeable !== true) {
        return false
      }
      if(!directory.children[file]) {
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
        if(p === '' || p === '.') {
          return false
        }
        if(p === '..') {
          position = parent
          if(fullPath.length > 1) {
            fullPath.pop()
          }
          return false
        }
        if(position.type === 'directory' && position.children[p]) {
          parent = position
          position = position.children[p]
          fullPath.push(p)
          return false
        }
        position = false
        return true
      })

      if(notfound) {
        return false
      }

      if(pointer) {
        return position
      }

      const fp = fullPath.length === 1 ? '/' : fullPath.join('/')

      return Object.assign({}, position, { fullPath: fp, basename: parts.pop() })
    }
  }

  class Shell {
    constructor(env, files) {
      this.inProcess = false
      this.sigIntReceived = false
      this.environment = new Environment(env, this)
      this.fileSystem = new FileSystem(files, this.environment, this)
      this.console = console
      this.rl = {
        close: () => {}
      }
      this.focus = () => {}
    }

    getPrompt() {
      return this.hasenv('PS1') ? this.getenv('PS1').replace('\\u', this.getenv('USER')).replace('\\h', this.getenv('HOSTNAME')).replace('\\w', this.getenv('PWD')) : '$'
    }

    getPath(path = '') {
      if(path.indexOf('/') != 0) {
        path = this.getenv('PWD') + '/' + path
      }
      return this.fileSystem.get(path)
    }

    createFile(path) {
      if(path.indexOf('/') != 0) {
        path = this.getenv('PWD') + '/' + path
      }
      return this.fileSystem.create(path)
    }

    openFile(path) {
      if(path.indexOf('/') != 0) {
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

    browser(window) {

      let ctrlDown = false

      const history = [

      ]

      let historyPointer = 0

      const document = window.document

      const [promptContainer, promptInput, promptStatement, output] = ['prompt-container','prompt-input','prompt-statement','output'].map(e => document.getElementById(e));

      /* Optimize input for mobile */
      promptInput.setAttribute('autocomplete', 'off')
      promptInput.setAttribute('role', 'presentation')
      promptInput.focus()

      /* Do not submit form on enter */
      promptContainer.addEventListener('submit', event => {
        event.preventDefault()
      })

      promptStatement.innerHTML = this.getPrompt() + ''

      this.focus = () => {
        promptInput.focus()
        window.scrollTo(0,window.document.body.scrollHeight);
      }

      this.console = {
        log: function() {
          output.innerHTML+=`<div>${Array.from(arguments).join(' ')}</div>`
          console.log.apply(console, arguments);
        },
        error: function() {
          console.error.apply(console, arguments);
        },
        clear: function() {
          output.innerHTML=''
        }
      }
      this.execute('cat /etc/motd').then(r => {
        document.addEventListener('keydown', event => {
          console.log('DOWN', event.keyCode);
          if(event.keyCode === 17) {
            ctrlDown = true
          }
        })
        document.addEventListener('keyup', event => {
          console.log('UP', event.keyCode);
          if(event.keyCode === 27 || (event.keyCode === 67 && ctrlDown)) {
            console.log("SIGINT")
            if(this.inProcess) {
              this.sigIntReceived = true
            }
          }
          // Introduce some extra checks that the cursor is at the end of the input
          if(event.keyCode === 38 || event.keyCode === 40) {
            if(event.keyCode === 38) {
              // UP
              historyPointer = historyPointer > 0 ? historyPointer-1 : 0
            } else if(event.keyCode === 40) {
              // DOWN
              historyPointer = historyPointer < history.length-1 ? historyPointer+1 : history.length-1
            }
            promptInput.value = history[historyPointer]
          }
          if(event.keyCode === 13) {
            const line = promptInput.value
            event.preventDefault()
            if(this.inProcess) {
              return
            }
            console.log(line)
            output.innerHTML+=`<div class="old-prompt"><span class="old-prompt-statement">${this.getPrompt()}</span><span class="old-prompt-input">${line}</span></div>`
            promptStatement.style.display = 'none';
            this.execute(line).then(result => {
              this.setenv('?', result)
              history.push(line)
              historyPointer = history.length
              promptStatement.innerHTML = this.getPrompt()
              promptInput.value = ''
              promptStatement.style.display = 'block';
              promptInput.focus()
            })
          }
        })
      })
    }

    readLine(process, readline) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: this.getPrompt(),
        completer: (line) => {
          const hits = Object.keys(this.getExecutablesInPath()).filter(e => e.startsWith(line))
          return [hits, line];
        }
      })

       this.execute('cat /etc/motd').then(r => {
        this.rl.prompt()
        this.rl.on('line', (line) => {
          if(this.inProcess) {
            return
          }
          this.execute(line).then(result => {
            this.setenv('?', result)
            this.rl.setPrompt(this.getPrompt())
            this.rl.prompt()
          })
        }).on('close', () => {
          process.exit(0);
        }).on('SIGINT', () => {
          if(this.inProcess) {
            this.sigIntReceived = true
          } else {
            this.execute('exit')
          }
        })
      })
    }

    getExecutablesInPath() {
      const executables = this.environment.get('PATH').split(':').reduce((result, path) => {
        const files = this.fileSystem.get(path).children
        if(!files) {
          return result
        }
        return Object.assign({}, result, Object.keys(files).reduce((result, file) => {
          if(files[file].executable) {
            result[file] = files[file]
          }
          return result
        }, {}))
      }, {})

      executables.exit = {
        executable: true,
        content: () => this.rl.close()
      }

      executables.clear = {
        executable: true,
        content: () => this.console.clear()
      }

      return executables
    }

    // TODO: Turn this into a "State Machine"
    _buildCmdLine(value) {
      // We add a space to the end as termination so the last element
      // is also stored
      const chars = (value+' ').split('');
      let input = ''
      let variableName = ''
      let variables = {}
      let state = 'INPUT'
      let previousState = ''
      let args = []
      let inDoubleQuotes = false
      let inSingleQuotes = false
      let redirections = []
      let redirectionMode = 'append'
      let current = ''
      let previous = ''
      for(let i = 0; i < chars.length; i++) {
        previous = current
        current = chars[i]

        if(previous !== '\\' && current === '"') {
          inDoubleQuotes = !inDoubleQuotes
          continue;
        }

        if(previous !== '\\' && current === '\'') {
          inSingleQuotes = !inSingleQuotes
          continue;
        }

        if(inDoubleQuotes || inSingleQuotes) {
          input+=current
          continue;
        }

        if([" ", ">"].includes(previous) && current === " ") {
          continue;
        }

        if(current === '>') {
          state = 'REDIRECTION'
          redirectionMode = previous === '>' ? 'append' : 'overwrite'
          continue;
        }

        switch(state) {
          case 'INPUT':
            if(current === '=') {
              state = 'VARIABLE'
              variableName = input
              input = ''
            } else if(current === ' ') {
              state = 'ARGS'
              args.push({ value: input, inSingleQuotes: previous === '\'' })
              input = ''
            } else {
              input+=current
            }
            break;
          case 'VARIABLE':
            if(current === ' ') {
              variables[variableName] = { value: input }
              input = ''
              state = 'INPUT'
            } else {
              input+=current
            }
            break;
          case 'ARGS':
            if(current === ' ') {
              args.push({ value: input, inSingleQuotes: previous === '\'' })
              input = ''
            } else {
              input+=current
            }
            break;
          case 'REDIRECTION':
            if(current === ' ') {
              redirections.push({
                target: input,
                mode: redirectionMode
              })
              redirectionMode = 'append'
              input = ''
              state = 'INPUT'
            } else {
              input+=current
            }
            break;
        }
      }

      variables = Object.keys(variables).reduce((result, current) => {
        const variable = variables[current]
        if(variable.inSingleQuotes) {
          result[current] = variable

        } else {
            result[current] = {
              value: this.environment.applyOnString(variable.value, result)
            }
        }
        return result
      }, {})

      return {
        variables,
        args: args.map(v => {
          if(v.inSingleQuotes) {
            return v.value
          }
          return this.environment.applyOnString(v.value, variables)
        }),
        redirections
      }
    }

    getRows() {
      return process.stdout.rows
    }

    out(str) {
      this.console.log(str)
    }

    err(str) {
      this.console.error(str)
    }

    interruptible(fnc) {
      return new Promise((resolve, reject) => {
        this.inProcess = true
        const generator = fnc()
        const f = () => {
          this.focus()
          if(this.sigIntReceived) {
            this.inProcess = false
            this.sigIntReceived = false
            resolve(1)
            return
          }
          const { value, done } = generator.next()
          if(done) {
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

        const { variables, args, redirections } = this._buildCmdLine(value)

        // console.log(variables, args, redirections)

        if(args.length === 0) {
          Object.keys(variables).forEach(key => this.setenv(key, variables[key].value))
          resolve()
          return
        }

        const input = args.shift()

        const executables = this.getExecutablesInPath()

        if(!executables[input]) {
          this.out(`Command not found: ${input}`)
          resolve(127)
          return
        }

        let out = this.out.bind(this)
        let fileHandles = []
        if(redirections.length > 0) {
          fileHandles = redirections.map(redirection => {
            return this.openFile(redirection.target, redirection.mode)
          })
          out = (str) => {
            fileHandles.forEach(fh => {
              if(fh.mode === 'error') {
                this.err(`${input}: ${fh.error}`)
                return
              }
              fh.write(str)
            })
          }
        }

        const result = executables[input].content(args, this, out, this.err)

        if (result instanceof Promise) {
          result.then(r => {
            fileHandles.forEach(fh => fh.close())
            resolve(r)
          })
        } else {
          fileHandles.forEach(fh => fh.close())
          resolve(result)
        }
      })
    }
  }

  const env = {
    '?': 0,
    USER: 'svrnm',
    HOSTNAME: 'svrnm.de',
    PWD: '/',
    PS1: '\\u@\\h \\w> ',
    PATH: '/bin/:/usr/bin/:/usr/local/bin'
  }

  const fs = {
    '/': {
      children: {
        bin: {
          children: {
            echo: (args, shell, out) => {
              out(args.join(' '))
              return 0
            },
            cat: (args, shell, out, err) => {
              const file = shell.getPath(args[0])
              if(file === false) {
                err(`cat: ${args[0]}: No such file or directory`)
                return 1
              }
              if(file.content) {
                out(file.content.toString())
                return 0
              }
              return 1
            },
            cd: (args, shell, out, err) => {
              const p = shell.getPath(args[0])
              if(p === false) {
                err(`cd: No such file or directory: ${args[0]}`)
                return 1
              }
              if(p.children) {
                shell.setenv('PWD', p.fullPath)
                return null
              }
               err(`cd: not a directory ${args[0]}`)
               return 1
            },
            ls: (args, shell, out, err) => {
              const p = shell.getPath(args[0])
              if(p === false) {
                out(`ls: No such file or directory: ${args[0]}`)
                return 1
              }
              if(p.children) {
                out(Object.keys(p.children).sort().join(' '))
                return 0
              }
              out(p.basename)
              return 0
            },
            env: (args, shell, out, err) => {
              out(shell.environment.toString())
              return 0
            },
            pwd: (args, shell, out, err) => {
              out(shell.getenv("PWD"))
              return 0
            },
            whoami: (args, shell, out, err) => {
              out(shell.getenv('USER'))
              return 0
            },
            yes: (args, shell, out, err) => {
              /*return shell.setInterval(() => {
                  out('yes')
              })*/
              return shell.interruptible(function*() {
                while(true) {
                  out('yes')
                  yield
                }
                return 0
              })
            },
            seq: (args, shell, out, err) => {
              let counter = parseInt(args[0])
              const limit = parseInt(args[1])
              return shell.interruptible(function*() {
                  while(counter <= limit) {
                    out(counter++)
                    yield
                  }
                  return 0
              })
            }
          }
        },
        etc: {
          children: {
            motd: 'Welcome to ShellJS, $USER!'
          }
        },
        tmp: {
          writeable: true,
          children: {

          }
        },
        usr: {
          children: {
            bin: {
              children: {
                date: (args, shell, out, err) => {
                  out((new Date()).toDateString());
                  return 0
                },
                touch: (args, shell) => {
                  const r = args.map(arg => {
                    const file = shell.createFile(arg)
                    if(file) {
                      return ''
                    }
                    return `touch: ${arg}: Permission denied`
                  }).filter(e => e !== null).join('\n')

                  if(r !== '') {
                    shell.err(r)
                    return 1
                  }
                  return 0
                }
              }
            }
          }
        }
      }
    }
  }

  const shell = new Shell(env, fs)

  if(win === false) {
    shell.readLine(process, require('readline'))
  } else {
    shell.browser(win)
  }
}(typeof window === 'undefined' ? false : window));
