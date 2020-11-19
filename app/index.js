import Shell from './classes/Shell.js'

(function(win) {
  'use strict';

  Shell.start(win, {
    USER: 'svrnm',
    HOSTNAME: 'svrnm.de',
    HOME: '/home/svrnm',
    PS1: '\\u@\\h \\w> '
  }, ($) => ({
    'home': {
        'children': {
          'svrnm': {
            'children': {
		'hello_world': $('files/hello_world')
	    }
          }
        }
    },
    etc: {
      children: {
        motd: $('files/motd')
      }
    },
    'var': {
      'children': {
        'log': {
          'writeable': true,
          'children': {

          }
        }
      }
    }
  }))

}(typeof window === 'undefined' ? false : window));
