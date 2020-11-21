class Process {
  static start(scope) {
    if(scope.stdin && scope.stdout) {
      return new NodeProcess(scope)
    } else {
      return new BrowserProcess(scope)
    }
  }
}

class BrowserProcess extends Process {
  constructor(window) {
    super(window)
    console.log('Running in Browser')
    this.firstPrompt = true
    this.window = window
    this.body = window.document.getElementById("cmsh")
    this.outputElement = window.document.querySelector("#cmsh > span")
    this.hintElement = window.document.getElementById("hints")
    this.cancelButton = window.document.getElementById("cancel-button")
    this.symbolHelper = window.document.getElementById("symbol")
    this.promptStr = '$'
    this.history = []
    this.historyPointer = 0
    this.onLine = () => {}
    this.listener = e => {
      if(e.metaKey) {
        return
      }
      console.log(e.key, e)

      if(e.ctrlKey) {
        if(e.key === 'c') {
          e.preventDefault()
          this.shell.trap('SIGINT')
        }
        return
      }

      e.preventDefault()
      if(e.key.length === 1) {
        this.output(e.key)
      }
      switch(e.keyCode) {
        case 8:
          // BACKSPACE
          this.backspace()
          break;
        case 13:
          // ENTER
          this.sendEnter()
          break;
        case 9:
          // Tab
          const [hints, line] = (this.shell.completer(this.outputElement.textContent))
          console.log(hints, line)
          if(hints.length === 1) {
            this.output(hints[0].substr(line.length))
          } else {
            this.hint(hints)
          }
          break;
        case 38:
          // Arrow up
          this.historyPointer = this.historyPointer > 0 ? this.historyPointer - 1 : 0
          this.setOutput(this.history[this.historyPointer])
          break;
        case 40:
          // Arrow down
          this.historyPointer = this.historyPointer < this.history.length - 1 ? this.historyPointer + 1 : this.history.length - 1
          this.setOutput(this.history[this.historyPointer])
          break;
      }
    }
  }

  hold() {
    this.cancelButton.style.display = 'block'
  }

  release() {
    this.cancelButton.style.display = 'none'
  }

  sendEnter() {
    this.hintElement.style.display = 'none'
    const l = this.outputElement.textContent
    this.history.push(l)
    this.historyPointer = history.length - 1
    this.lineBreak()
    this.onLine(l)
  }

  hint(hints) {
    console.log(hints)
    this.hintElement.style.display = 'block'
    this.hintElement.innerHTML = hints.map(hint => {
      const h = hint.split(' ').pop()
      return `<a class="command-hint" href="#${hint}">${h}</a>`
    }).join(' ')
    /*
    const div = document.createElement('div')
    div.setAttribute('id', 'hints')
    this.body.appendChild(div)
    div.textContent = hints.join(' ')
    */
  }

  focus() {
    // this.outputElement.focus()
    this.window.scrollTo(0, this.window.document.body.scrollHeight)
  }

  setOutput(data) {
    this.outputElement.textContent=data
  }

  output(data) {
    this.outputElement.textContent+=data
  }

  backspace() {
    this.outputElement.textContent = this.outputElement.textContent.slice(0, -1)
  }

  createNewOutputArea() {
    const span = document.createElement('span')
    this.body.appendChild(span)
    this.outputElement = span
    this.focus()
  }

  lineBreak() {
    console.log("LINEBREAK")
    const br = document.createElement('br')
    this.body.appendChild(br)
    this.createNewOutputArea()
  }

  prompt() {
    console.log("PROMPT")
    const p = document.createElement('span')
    p.textContent = this.promptStr
    this.body.appendChild(p)
    const span = document.createElement('span')
    this.body.appendChild(span)
    this.outputElement = span
    if(this.firstPrompt) {
      this.firstPrompt = false
      this.updateFromHash()
    }
    this.focus()
  }

  clear() {
    this.body.innerHTML=''
    this.createNewOutputArea()
  }

  exit() {
    this.window.document.removeEventListener('keydown', this.listener)
    this.window.document.body.innerHTML='Good Bye'
  }

  async fetch(file) {
    const response = await window.fetch(file)
    return await response.text()
  }

  log() {
    let data = Array.from(arguments).join(' ')
    if(!data.endsWith('\n')) {
      data+='\n'
    }
    this.output(data)
    this.focus()
    console.log('=== LOG ===')
    console.log.apply(console, arguments);
  }

  error() {
    this.log.apply(this, arguments)
  }

  getColumns() {
    const heigth = parseFloat(window.getComputedStyle(this.body, null).getPropertyValue('height'))

    // 684 20
    console.log(heigth, this.symbolHelper.scrollHeight)

    return Math.floor(heigth / this.symbolHelper.scrollHeight)
  }

  getRows() {
    const width = parseFloat(window.getComputedStyle(this.body, null).getPropertyValue('width'))
    const symbolWidth = this.symbolHelper.scrollWidth/10

    return Math.floor(width / symbolWidth)
  }

  async updateFromHash() {
    let h = decodeURIComponent(this.window.document.location.hash.substr(1))
    if(h.length === 0) {
      return
    }
    let sendEnter = false
    if(h.endsWith('!')) {
      h = h.slice(0, -1)
      sendEnter = true
    }
    this.setOutput(h)
    if(sendEnter) {
      this.sendEnter()
    }
  }

  async run(shell) {

    this.outputElement.focus()

    this.window.onhashchange = () => {
      this.updateFromHash()
    }

    this.shell = shell
    this.window.document.addEventListener('keydown', this.listener)

    this.cancelButton.addEventListener('click', e => {
      event.preventDefault()
      shell.trap('SIGINT')
    })

    this.window.document.addEventListener('touchstart', e => {
      this.outputElement.setAttribute('contenteditable', true)
      this.outputElement.setAttribute('autocapitalize', 'off')
      this.outputElement.focus()
    })

    this.focus()

    this.getRows()

    return {
      setPrompt: (prompt) => {
        this.promptStr = prompt
      },
      prompt: () => this.prompt(),
      on: (what, cb) => {
        if(what === 'line') {
          this.onLine = cb
        }
      }
    }
  }
}

class NodeProcess extends Process {
  constructor(process) {
    super(process)
    this.process = process
    console.log('Running on Node.JS')
  }

  exit() {
    this.process.exit(0)
  }

  log() {
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

export default Process
