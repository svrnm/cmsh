import StateMachine from './StateMachine.js'

class BrowserProcess {
  constructor(window) {
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

    this.stash = '';

    this.tag = 'span'
    this.css = ''

    this.isReader = false
    this.readCb = () => {}

    this.historyPointer = 0
    this.onLine = () => {}
    this.listener = e => {
      if(e.metaKey) {
        return
      }
      // console.log(e.key, e)

      if(e.ctrlKey) {
        if(e.key === 'c') {
          e.preventDefault()
          this.sendSignal('SIGINT')
        }
        if(e.key === 'u') {
          e.preventDefault()
          this.stash = this.outputElement.textContent
          this.outputElement.textContent = ''
        }
        if(e.key === 'y') {
          e.preventDefault()
          this.output(this.stash)
        }
        return
      }

      if(this.isReader) {
        e.preventDefault()
        this.readCb(e.key)
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
          this.shell.completer(this.outputElement.textContent).then(result => {
            const [hints, line] = result
            console.log(hints, line)
            if(hints.length === 1) {
              this.output(hints[0].substr(line.length))
            } else {
              this.hint(hints)
            }
          })
          break;
        case 38:
          // Arrow up
          this.historyUp()
          break;
        case 40:
          // Arrow down
          this.historyDown()
          break;
      }
    }
  }

  sendSignal(signal) {
    if(this.isReader) {
      this.readCb(signal)
    }
    this.shell.trap(signal)
  }

  historyUp() {
    if(this.history.length === 0) {
      return
    }
    this.historyPointer = this.historyPointer > 0 ? this.historyPointer - 1 : 0
    this.setOutput(this.history[this.historyPointer])
  }

  historyDown() {
    if(this.history.length === 0) {
      return
    }
    this.historyPointer = this.historyPointer < this.history.length - 1 ? this.historyPointer + 1 : this.history.length - 1
    this.setOutput(this.history[this.historyPointer])
  }

  hold() {
    this.cancelButton.style.display = 'block'
  }

  release() {
    this.cancelButton.style.display = 'none'
  }

  readChar() {
    return new Promise((resolve, reject) => {
      this.isReader = true
      this.readCb = (char) => {
        if(char === 'SIGINT') {
          reject()
        }
        this.isReader = false
        resolve(char)
      }
    })
  }

  sendEnter() {
    this.hintElement.style.display = 'none'
    const l = this.outputElement.textContent
    this.history.push(l)
    this.historyPointer = this.history.length
    this.lineBreak()
    this.onLine(l)
  }

  hint(hints) {
    // console.log(this.hintElement)
    this.hintElement.style.display = 'block'
    this.hintElement.innerHTML = hints.map(hint => {
      const h = hint.split(' ').pop()
      return `<a class="command-hint" href="#${hint}">${h}</a>`
    }).join(' ')
    this.focus()
  }

  focus() {
    this.window.scrollTo(0, this.window.document.body.scrollHeight)
  }

  setOutput(data) {
    this.outputElement.textContent = ''
    this.output(data)
  }

  output(data, tag = this.tag, css = this.css) {
    this.outputElement.insertAdjacentHTML('beforeend', data.split('').map(c => `<${tag} ${css}>${c}</${tag}>`).join(''))
  }

  backspace() {
    if(this.outputElement.lastElementChild) {
      this.outputElement.removeChild(this.outputElement.lastElementChild)
    }
  }

  createNewOutputArea() {
    const span = document.createElement('span')
    this.body.insertBefore(span, this.hintElement)
    this.outputElement = span
    this.focus()
  }

  lineBreak() {
    const br = document.createElement('br')
    this.body.insertBefore(br, this.hintElement)
    this.createNewOutputArea()
  }

  prompt() {
    this.createNewOutputArea()
    this.parseAndOutput(this.promptStr)

    this.createNewOutputArea()

    if(this.firstPrompt) {
      this.firstPrompt = false
      this.updateFromHash()
    }
    // this.focus()
  }

  clear() {
    // Remove all elements except hint and textNode
    while(this.body.childNodes.length > 2) {
      this.body.removeChild(this.body.firstChild)
    }
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

  parseAndOutput(data) {
    const parser = StateMachine.initalize({
      'normal': (c) => {
        if(c === '\\') {
          return 'backslash'
        }
        this.output(c)
        return 'normal'
      },
      'backslash': (c) => {
        const specialChars = {
          '\'': '\'',
          '\"': '\"',
          '\\': '\\',
          'n': '\n',
          't': '\t',
          'r': '\r',
          'v': '\v',
          'b': '\b',
          'f': '\f'
        }

        if(Object.keys(specialChars).includes(c)) {
          this.output(specialChars[c])
          return 'normal'
        }
        if(c === 'x') {
          return ['latin1', { numbers: [] } ]
        }
        if(c === 'e') {
          return ['escape', { chars: [] }]
        }
        this.output('\\')
        this.output(c)
        return 'normal'
      },
      'latin1' : (c, state) => {
        if(state.numbers.length === 2) {
          this.output(String.fromCharCode(`0x${state.numbers.join('')}`))
          return 'normal'
        }
        if(/^\d$/.test(c)) {
          state.numbers.push(c)
          return ['latin1', state]
        }
        return ['error', { message: 'Invalid hexadecimal escape sequence' }]
      },
      'escape' : (c, state) => {
        // We look for \e[stuffm
        if(state.chars.length === 0 && c !== '[') {
          // \e is just non-printable and we skip
          return 'normal'
        }
        // There are some other escape sequences
        // but right now I'd like to have colors etc.
        if(c === 'm') {
          // Remove [
          state.chars.shift()
          this.outputEscapeSequence(state.chars.join('') + 'm')
          return 'normal'
        }
        state.chars.push(c)
        return ['escape', state]
      }
    }, 'normal')

    data.split('').forEach(char => {
      parser.next(char)
    })

    parser.next('')

    this.resetOutput()

    return 0
  }

  writeLine() {
    let data = Array.from(arguments).join(' ')
    if(!data.endsWith('\n')) {
      data+='\n'
    }
    this.parseAndOutput(data)
    this.focus()
    //console.log('=== LOG ===')
    //console.log.apply(console, arguments);
  }

  writeChar(c) {
    this.output(c)
  }

  outputEscapeSequence(sequence) {
    if(sequence === '0m') {
      this.resetOutput()
    } else if(sequence.startsWith('38')) {
      const segments = sequence.split(';').map(x => parseInt(x))
      // Remove 38
      segments.shift()
      if(segments[0] === 2) {
        segments.shift()
        this.css = `style="color: rgb(${segments.join(',')});"`
      }
    } else if(sequence.endsWith('m')) {
      this.css = `class="m${sequence.slice(0,-1).replace(/;/g, ' m')}"`
    }
    //this.output(sequence)
  }

  resetOutput() {
    this.tag = 'span'
    this.css = ''
  }

  writeErrorLine() {
    this.writeLine.apply(this, arguments)
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
      this.sendSignal('SIGINT')
    })

    this.window.document.addEventListener('touchstart', e => {
      this.outputElement.setAttribute('contenteditable', true)
      this.outputElement.setAttribute('autocapitalize', 'off')
      this.outputElement.focus()
    })

    this.window.document.addEventListener('paste', (event) => {
      console.log('PASTE', event)
      let paste = (event.clipboardData || window.clipboardData).getData('text');
      this.output(paste)
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

export default BrowserProcess
