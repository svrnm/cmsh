import Shell from './classes/Shell.js'
import config from './config.js'
import Process from './classes/Process.js'

(function(scope) {
  Shell.start(Process.start(scope), config.environment, config.fileSystems)
}(typeof window === 'undefined' ? process : window));
