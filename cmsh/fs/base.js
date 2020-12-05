export default {
  '/': {
    children: {
      bin: {
        children: {
          help: (args, shell, io) => {
            io.writeLine("I am here to help. Type commands to interact with the shell.")
            io.writeLine("The most important ones are:\n\n")
            io.writeLine("- ls — list all files")
            io.writeLine("- cat <file> — Show the content of a file, e.g. try 'cat /etc/motd'")
            io.writeLine("- cd <dir> — Change the working directory, e.g. try 'cd /etc' and then 'cat motd'")
            io.writeLine("- fortune — like a fortune cookie, but only the message.")
            io.writeLine("\n\nThere are many more commands. Press 'Tab' to get a list of all of them")
            return 0
          },
          echo: async (args, shell, io) => {
            await io.writeLine(args.join(' '))
            return 0
          },
          cat: (args, shell, io) => {
            return new Promise((resolve, reject) => {
              shell.openFile(args[0], 'read').then(file => {
                // console.log(file)
                if (file === false) {
                  io.writeLine(`cat: ${args[0]}: No such file or directory`)
                  resolve(1)
                }
                file.read().then(data => {
                  io.writeLine(data)
                  resolve(0)
                }).catch(error => {
                  io.writeErrorLine(error)
                  resolve(1)
                })
              })
            })
          },
          cd: async (args, shell, io) => {
            if(args.length === 0) {
              args[0] = shell.getenv("HOME")
            }
            const p = await shell.getPath(args[0])
            if (p === false) {
              io.writeErrorLine(`cd: No such file or directory: ${args[0]}`)
              return 1
            }
            if (p.children) {
              shell.setenv('PWD', p.fullPath)
              return null
            }
            io.writeErrorLine(`cd: not a directory ${args[0]}`)
            return 1
          },
          ls: async (args, shell, io) => {
            const p = await shell.getPath(args[0])
            console.log(p)
            if (p === false) {
              io.writeErrorLine(`ls: No such file or directory: ${args[0]}`)
              return 1
            }
            if (p.children) {
              io.writeLine(Object.keys(p.children).sort().join(' '))
              return 0
            }
            io.writeLine(p.basename)
            return 0
          },
          env: (args, shell, io) => {
            io.writeLine(shell.environment.toString())
            return 0
          },
          pwd: (args, shell, io) => {
            io.writeLine(shell.getenv("PWD"))
            return 0
          },
          whoami: (args, shell, io) => {
            io.writeLine(shell.getenv('USER'))
            return 0
          },
          yes: (args, shell, io) => {
            return shell.interruptible(function*() {
              while (true) {
                io.writeLine('yes')
                yield
              }
              return 0
            })
          },
          sl: (args, shell, io) => {
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
                  io.writeLine(train.join('\n'))
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
          sleep: (args, shell, io) => {
            return shell.interruptible(function*() {
              const val = parseInt(args[0])
              yield new Promise((resolve, reject) => {
                setTimeout(() => {
                  resolve()
                }, val * 1000)
              })
            })
          },
          envsubst: async (args, shell, io) => {
            const str = await io.readAll()
            await io.writeLine(shell.applyenv(str))
            return 1
          },
          seq: (args, shell, io) => {
            let counter = parseInt(args[0])
            const limit = parseInt(args[1])
            return shell.interruptible(function*() {
              while (counter <= limit) {
                io.writeLine(counter++)
                yield
              }
              return 0
            })
          },
          su: (args, shell, io) => {
            io.writeLine('¯\\_(ツ)_/¯')
            shell.setenv('USER', 'root')
          },
          uname: (args, shell, io) => {
            io.writeLine('cmsh svrnm.de 0.1.0 #1 SMP Mon Nov 23 21:37:51 CET 2020 js')
          }
        }
      },
      home: {
        children: {}
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
      var: {
        writeable: true,
        children: {

        }
      },
      usr: {
        children: {
          bin: {
            children: {
              date: (args, shell, io) => {
                io.writeLine((new Date()).toDateString());
                return 0
              },
              less: (args, shell, io) => {
                shell.clear()
                return shell.interruptible(function*() {
                  yield new Promise((resolve, reject) => {
                    shell.openFile(args[0], 'read').then(file => {
                      if (file === false) {
                        io.writeLine(`cat: ${args[0]}: No such file or directory`)
                        reject(1)
                      }
                      file.read().then(data => {
                        io.writeLine(data)
                        resolve()
                      })
                    })
                  })

                  io.writeLine('\n === Press Enter to Finish === ')

                  let isEnter = false;
                  while(!isEnter) {
                    yield new Promise((resolve, reject) => {
                      io.readChar().then(function(char) {
                        isEnter = char === 'Enter'
                        resolve()
                      }).catch(function(signal) {
                        // We can just resolve as the interruptable
                        // takes care of the exit
                        resolve()
                      })
                    })
                  }
                  return 0
                })
              },
              fortune: (args, shell, io) => {
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
                io.writeLine(data[Math.floor(Math.random() * data.length)])
                return 0;
              },
              touch: (args, shell, io) => {
                const r = args.map(arg => {
                  const file = shell.createFile(arg)
                  if (file) {
                    return ''
                  }
                  return `touch: ${arg}: Permission denied`
                }).filter(e => e !== null).join('\n')
                if (r !== '') {
                  io.writeErrorLine(r)
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
