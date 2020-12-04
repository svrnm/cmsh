class NodeProcess extends Process {
  constructor(process) {
    super(process)
    this.process = process
    console.log('Running on Node.JS')
  }

  exit() {
    this.process.exit(0)
  }

  writeLine() {
    console.log.apply(console, arguments)
  }

  error() {
    console.error.apply(console, arguments)
  }

  async fetch(file) {
    const fs = await import('fs/promises')
    return await fs.readFile('../' + file, 'utf-8')
  }

  async run(shell) {
    const readline = await import('readline')
    const rl = readline.createInterface({
      input: this.process.stdin,
      output: this.process.stdout,
      completer: (line) => {
        return shell.completer(line)
      }
    })

    rl.on('close', () => {
      shell.exit()
    })

    rl.on('SIGINT', () => {
      shell.trap('SIGINT')
    })

    return rl
  }
}

export default NodeProcess
