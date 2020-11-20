// import Shell from '../src/classes/Shell.js'
import readline from 'readline'
import config from '../src/config.js'
import fetch from 'node-fetch'

if (!globalThis.fetch) {
    globalThis.fetch = fetch;
}

Shell.start(readline, config.environment, config.fileSystems)
