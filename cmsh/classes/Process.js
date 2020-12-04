import BrowserProcess from './BrowserProcess.js'

class Process {
  static start(scope) {
    if(scope.stdin && scope.stdout) {
      return new NodeProcess(scope)
    } else {
      return new BrowserProcess(scope)
    }
  }
}

export default Process
