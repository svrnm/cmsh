export default {
  '/': {
    writeable: true,
    children: {
      bin: {
        children: {
          echo: (args, shell, out) => {
            out(args.join(' '))
            return 0
          },
          debug: (args, shell, out, err, inFn) => {
            return shell.interruptible(function*() {
              return new Promise((resolve, reject) => {

              })
            })
          },
          cat: (args, shell, out, err) => {
            return new Promise((resolve, reject) => {
              const file = shell.openFile(args[0], 'read')
              if (file === false) {
                err(`cat: ${args[0]}: No such file or directory`)
                resolve(1)
              }
              file.read().then(data => {
                out(data)
                resolve(0)
              }).catch(error => {
                err(error)
                resolve(1)
              })
            })
          },
          cd: (args, shell, out, err) => {
            console.log(args)
            if(args.length === 0) {
              args[0] = shell.getenv("HOME")
            }
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
          envsubst: (args, shell, out, err, inFn) => {
            return new Promise((resolve, reject) => {
              inFn().then(str => {
                out(shell.applyenv(str))
                resolve(1)
              })
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
          },
          su: (args, shell, out, err) => {
            out('¯\\_(ツ)_/¯')
            shell.setenv('USER', 'root')
          }
        }
      },
      etc: {
        children: {
          motd: 'Welcome to cm.sh!'
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
              fortune: (args, shell, out, err) => {
                const data = [
                  "Darmok and Jalad… at Tanagra.",
                  "Shaka, when the walls fell.",
                  "Temba, his arms wide!",
                  "Resistance is futile.",
                  "Live long and prosper",
                  "I believe in coincidences. Coincidences happen every day. But I don't trust coincidences.",
                  "The truth is usually just an excuse for lack of imagination.",
                ];
                out(data[Math.floor(Math.random() * data.length)])
                return 0;
              },
              touch: (args, shell, out, err) => {
                const r = args.map(arg => {
                  const file = shell.createFile(arg)
                  if (file) {
                    return ''
                  }
                  return `touch: ${arg}: Permission denied`
                }).filter(e => e !== null).join('\n')
                if (r !== '') {
                  err(r)
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
