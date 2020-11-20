import Shell from './classes/Shell.js'
import config from './config.js'

(function(win) {
  console.log(typeof require)
  Shell.start(win, config.environment, config.fileSystems)
}(typeof window === 'undefined' ? false : window));
