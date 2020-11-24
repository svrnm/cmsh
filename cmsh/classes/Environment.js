class Environment {
  constructor(values) {
    this.values = Object.keys(values).reduce((result, key) => {
      result[key] = {
        value: values[key]
      }
      return result
    }, {})
  }

  get(key) {
    if(key === 'RANDOM') {
      // Range of random is 0 - 32767
      return Math.floor(Math.random() * Math.floor(32767));
    }
    return this.values[key].value
  }

  has(key) {
    if(key === 'RANDOM') {
      return true
    }
    return typeof this.values[key] === 'object'
  }

  set(key, value) {
    this.values[key] = {
      value
    }
  }

  toString() {
    return Object.keys(this.values).map(key => {
      return `${key}=${this.values[key].value}`
    }).join('\n')
  }

  applyOnString(str, localVariables = {}) {
    return str.replace(/\$((\{[^}]*\})|(\S*))/g, (content, matchNoCurly, matchInCurly, y) => {
      if (matchInCurly) {
        const variable = matchInCurly.substr(1, matchInCurly.length - 2)
        if (typeof localVariables[variable] === 'object') {
          return localVariables[variable].value
        }
        if (this.has(variable)) {
          return this.get(variable)
        }
      }
      if (matchNoCurly) {
        if (typeof localVariables[matchNoCurly] === 'object') {
          return localVariables[matchNoCurly].value
        }
        if (this.has(matchNoCurly)) {
          return this.get(matchNoCurly)
        }
      }
      return content
    });

  }
}

export default Environment;
