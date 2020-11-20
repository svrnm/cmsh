export default {
  environment: {
    USER: 'svrnm',
    HOSTNAME: 'svrnm.de',
    HOME: '/home/svrnm',
    PS1: '\\u@\\h \\w> '
  },
  fileSystems: ($) => ({
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
  })
}
