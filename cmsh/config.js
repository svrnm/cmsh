export default {
  environment: {
    USER: 'svrnm',
    HOSTNAME: 'svrnm.de',
    HOME: '/home/svrnm',
    PS1: '\\e[31;100m\\u@\\e[36;100m\\h \\e[92;100m\\w\\e[30;100m>\\e[0m '
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
        motd: $('files/motd'),
        imprint: $('files/imprint')
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
