import Shell from './classes/Shell'

(function(win) {
  'use strict';

  Shell.start(win, {
    USER: 'svrnm',
    HOSTNAME: 'svrnm.de',
    PS1: '\\u@\\h \\w> '
  })

}(typeof window === 'undefined' ? false : window));
