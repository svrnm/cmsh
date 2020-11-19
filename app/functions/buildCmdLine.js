// TODO: Turn this into a "State Machine"
  function buildCmdLine(value, environment) {
  // We add a space to the end as termination so the last element
  // is also stored
  const chars = (value + ' ').replaceAll(/([<>]+)/g, ' $1 ').split('');
  let input = ''
  let variableName = ''
  let variables = {}
  let state = 'INPUT'
  let previousState = ''
  let args = []
  let inDoubleQuotes = false
  let inSingleQuotes = false
  let redirections = []
  let redirectionMode = 'append'
  let current = ''
  let previous = ''
  for (let i = 0; i < chars.length; i++) {
    previous = current
    current = chars[i]

    if (previous !== '\\' && current === '"') {
      inDoubleQuotes = !inDoubleQuotes
      continue;
    }

    if (previous !== '\\' && current === '\'') {
      inSingleQuotes = !inSingleQuotes
      continue;
    }

    if (inDoubleQuotes || inSingleQuotes) {
      input += current
      continue;
    }

    if ([" ", ">", "<"].includes(previous) && current === " ") {
      continue;
    }

    if (current === '>' || current === '<') {
      state = 'REDIRECTION'
      redirectionMode = (() => {
        if(current === '<') {
          return 'read'
        }
        if(previous === '>') {
          return 'append'
        }
        return 'overwrite'
      })()
      continue;
    }

    switch (state) {
      case 'INPUT':
        if (current === '=') {
          state = 'VARIABLE'
          variableName = input
          input = ''
        } else if (current === ' ') {
          state = 'ARGS'
          args.push({
            value: input,
            inSingleQuotes: previous === '\''
          })
          input = ''
        } else {
          input += current
        }
        break;
      case 'VARIABLE':
        if (current === ' ') {
          variables[variableName] = {
            value: input
          }
          input = ''
          state = 'INPUT'
        } else {
          input += current
        }
        break;
      case 'ARGS':
        if (current === ' ') {
          args.push({
            value: input,
            inSingleQuotes: previous === '\''
          })
          input = ''
        } else {
          input += current
        }
        break;
      case 'REDIRECTION':
        if (current === ' ') {
          redirections.push({
            target: input,
            mode: redirectionMode
          })
          redirectionMode = 'append'
          input = ''
          state = 'INPUT'
        } else {
          input += current
        }
        break;
    }
  }

  variables = Object.keys(variables).reduce((result, current) => {
    const variable = variables[current]
    if (variable.inSingleQuotes) {
      result[current] = variable

    } else {
      result[current] = {
        value: environment.applyOnString(variable.value, result)
      }
    }
    return result
  }, {})

  return {
    variables,
    args: args.map(v => {
      if (v.inSingleQuotes) {
        return v.value
      }
      return environment.applyOnString(v.value, variables)
    }),
    redirections
  }
}

export default buildCmdLine
