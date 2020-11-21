export default {
  '/': {
    writeable: true,
    children: {
      bin: {
        children: {
          help: (args, shell, out) => {
            out("I am here to help. Type commands to interact with the shell.")
            out("The most important ones are:\n\n")
            out("- ls — list all files")
            out("- cat <file> — Show the content of a file, e.g. try 'cat /etc/motd'")
            out("- cd <dir> — Change the working directory, e.g. try 'cd /etc' and then 'cat motd'")
            out("- fortune — like a fortune cookie, but only the message.")
            out("\n\nThere are many more commands. Press 'Tab' to get a list of all of them")
            return 0
          },
          echo: (args, shell, out) => {
            out(args.join(' '))
            return 0
          },
          cat: (args, shell, out, err) => {
            return new Promise((resolve, reject) => {
              const file = shell.openFile(args[0], 'read')
              console.log(file)
              if (file === false) {
                out(`cat: ${args[0]}: No such file or directory`)
                resolve(1)
              }
              file.read().then(data => {
                out(data)
                resolve(0)
              }).catch(error => {
                out(error)
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
          sl: (args, shell, out, err) => {
            shell.clear()
            return shell.interruptible(function*() {
                const r = shell.process.getRows()
                const c = shell.process.getColumns()

                let trains = [
                  ['____', '|DD|____T_', '|_ |_____|<', '  @-@-@-oo\\'],
                  ["     _____","  ___ |[]|_n__n_I_c"," |___||__|###|____}","  O-O--O-O+++--O-O"]
                ]

                let train = trains[Math.floor(Math.random() * trains.length)]

                for(let i = 0; i < r; i++) {
                  train = train.map(line => {
                    return (' ' + line).slice(0, r)
                  })
                  out(train.join('\n'))
                  yield new Promise((resolve, reject) => {
                    setTimeout(() => {
                      shell.clear()
                      resolve()
                    }, 500)
                  })
                }
                return
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
                  "A friend is a present you give yourself.",
                  "A smile is your personal welcome mat.",
                  "A truly rich life contains love and art in abundance.",
                  "All the effort you are making will ultimately pay off.",
                  "An inch of time is an inch of gold.",
                  "Curiosity kills boredom. Nothing can kill curiosity.",
                  "Don’t just think, act!",
                  "Every flower blooms in its own sweet time.",
                  "Fortune Not Found: Abort, Retry, Ignore?",
                  "Have a beautiful day.",
                  "Now is the time to try something new.",
                  "Practice makes perfect.",
                  "There’s no such thing as an ordinary cat.",
`
  _____              __
_/ ____\\____________/  |_ __ __  ____   ____
\\   __\\/  _ \\_  __ \   __\\  |  \\/    \\_/ __ \\
 |  | (  <_> )  | \\/|  | |  |  /   |  \\  ___/
 |__|  \\____/|__|   |__| |____/|___|  /\\___  >
                                    \\/     \\/
`
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
