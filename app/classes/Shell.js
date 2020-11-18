import Environment from './Environment'
import FileSystem from './FileSystem'
import buildCmdLine from '../functions/buildCmdLine'

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

  static start(win, env) {
    /* Base FS */
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
                if (file === false) {
                  err(`cat: ${args[0]}: No such file or directory`)
                  return 1
                }
                if (file.content) {
                  out(file.content.toString())
                  return 0
                }
                return 1
              },
              cd: (args, shell, out, err) => {
                const p = shell.getPath(args[0])
                if (p === false) {
                  err(`cd: No such file or directory: ${args[0]}`)
                  return 1
                }
                if (p.children) {
                  shell.setenv('PWD', p.fullPath)
                  return null
                }
                err(`cd: not a directory ${args[0]}`)
                return 1
              },
              ls: (args, shell, out, err) => {
                const p = shell.getPath(args[0])
                if (p === false) {
                  out(`ls: No such file or directory: ${args[0]}`)
                  return 1
                }
                if (p.children) {
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
                  while (true) {
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
                  while (counter <= limit) {
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
              motd: 'Welcome to cm.sh, $USER!'
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
                      if (file) {
                        return ''
                      }
                      return `touch: ${arg}: Permission denied`
                    }).filter(e => e !== null).join('\n')

                    if (r !== '') {
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

    const shell = new Shell(Object.assign({
      '?': 0,
      'PWD': '/',
      PATH: '/bin/:/usr/bin/:/usr/local/bin'
    }, env), fs)

    if (win === false) {
      shell.readLine(process, require('readline'))
    } else {
      shell.browser(win)
    }

    return shell
  }

  getPrompt() {
    return this.hasenv('PS1') ? this.getenv('PS1').replace('\\u', this.getenv('USER')).replace('\\h', this.getenv('HOSTNAME')).replace('\\w', this.getenv('PWD')) : '$'
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

  browser(window) {

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

    /* Do not submit form on enter */
    promptContainer.addEventListener('submit', event => {
      event.preventDefault()
    })

    document.addEventListener('focusout', function() {
      promptInput.focus()
    }, true);

    window.onhashchange = () => {
      updateFromHash()
    }


    promptStatement.innerHTML = this.getPrompt() + ''

    this.focus = () => {
      promptInput.focus()
      window.scrollTo(0, window.document.body.scrollHeight);
    }

    this.console = {
      log: function() {
        output.innerHTML += `<div>${Array.from(arguments).join(' ')}</div>`
        console.log.apply(console, arguments);
      },
      error: function() {
        console.error.apply(console, arguments);
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
        // Auto Complete
        if(event.keyCode === 9) {
          event.preventDefault()
          Object.keys(this.getExecutablesInPath()).forEach(cmd => {
            const hits = Object.keys(this.getExecutablesInPath()).filter(e => e.startsWith(promptInput.value))
            if(hits.length === 1) {
              promptInput.value = hits.pop()
            } else {
              hints.innerHTML = hits.map(e => `<a class="command-hint" href="#${e}">${e}</a>`).join('\t')
            }
          })
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
          event.preventDefault()
          if (this.inProcess) {
            return
          }
          hints.innerHTML = ''
          console.log(line)
          output.innerHTML += `<div class="old-prompt"><span class="old-prompt-statement">${this.getPrompt()}</span><span class="old-prompt-input">${line}</span></div>`
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
        if (this.inProcess) {
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
        if (this.inProcess) {
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
      content: () => this.rl.close()
    }

    executables.clear = {
      executable: true,
      content: () => this.console.clear()
    }

    return executables
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
        if (this.sigIntReceived) {
          this.inProcess = false
          this.sigIntReceived = false
          resolve(1)
          return
        }
        const {
          value,
          done
        } = generator.next()
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

      // console.log(variables, args, redirections)

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

      let out = this.out.bind(this)
      let fileHandles = []
      if (redirections.length > 0) {
        fileHandles = redirections.map(redirection => {
          return this.openFile(redirection.target, redirection.mode)
        })
        out = (str) => {
          fileHandles.forEach(fh => {
            if (fh.mode === 'error') {
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

export default Shell
