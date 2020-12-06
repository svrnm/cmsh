export default {
  environment: {
    USER: 'svrnm',
    HOSTNAME: 'svrnm.de',
    HOME: '/home/svrnm',
    PS1: '\\e[31;100m\\u@\\e[36;100m\\h \\e[92;100m\\w\\e[30;100m>\\e[0m '
  },
  fstab: [
      {
        deviceSpec: 'base.js',
        mountPoint: '/',
        fsType: 'jfs',
        options: 'ro'
      },
      {
        deviceSpec: `${document.location.protocol}//${document.location.host}/files/etc/`,
        mountPoint: '/etc',
        fsType: 'httpfs',
        options: 'ro'
      },
      {
        deviceSpec: `${document.location.protocol}//${document.location.host}/files/home/`,
        mountPoint: '/home',
        fsType: 'httpfs',
        options: 'ro'
      },
      {
        deviceSpec: `${document.location.protocol}//${document.location.host}/files/logs/`,
        mountPoint: '/var/log',
        fsType: 'httpfs',
        options: 'rw'
      },
      {
        deviceSpec: 'tmpfs',
        mountPoint: '/tmp',
        fsType: 'tmpfs',
        options: 'rw'
      },
      {
        deviceSpec: window.localStorage,
        mountPoint: '/usr/local',
        fsType: 'wsfs',
        options: 'rw',
      }
  ]
}
