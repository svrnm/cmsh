import StateMachine from '../classes/StateMachine.js'

class Line {
    constructor(variables, args, redirections) {
        this.variables = variables
        this.args = args
        this.redirections = redirections
    }

    static build(value, environment) {

        const tokens = []



        // X=3 Y='${X}'"123"$X Z="Das ist $Y + $X $(ls)"   /usr/bin/cmd ./apath $(exec)    '$(exec)$X'$X"$X" $X "$X" "$" >asdf>>asdf <<asdf <asdf

        const tokenizer = StateMachine.initalize({
            argument: (c, state) => {
                if (c === '\\') {
                    state.escaped = true
                    return ['argument', state]
                }

                if (!state.escaped && c === '\"') {
                    state.values.push({
                        inSingleQuotes: false,
                        value: state.chars.join('')
                    })
                    state.chars = []
                    return [
                        'inDoubleQuotes',
                        {
                            parent: ['argument', state],
                            chars: []
                        }
                    ]
                }


                if (!state.escaped && c === '\'') {
                    state.values.push({
                        inSingleQuotes: false,
                        value: state.chars.join('')
                    })
                    state.chars = []
                    return [
                        'inSingleQuotes',
                        {
                            parent: ['argument', state],
                            chars: []
                        }
                    ]
                }



                if (!state.escaped && c === ' ') {
                    state.values.push({
                        inSingleQuotes: false,
                        value: state.chars.join('')
                    })
                    const values = state.values.filter(v => v.value !== '')
                    if(values.length > 0) {
                        tokens.push(values)
                    }
                    state.values = []
                    state.chars = []
                    return ['argument', state]
                }

                if(state.escaped) {
                  state.chars.push('\\')
                  state.escaped = false
                }

                state.chars.push(c)
                return ['argument', state]
            },
            inSingleQuotes: (c, state) => {
                if (c === '\\') {
                    state.escaped = true
                    return ['inSingleQuotes', state]
                }
                if(!state.escaped && c === '\'') {
                    state.parent[1].values.push({
                        inSingleQuotes: true,
                        value: state.chars.join('')
                    })
                    return state.parent
                }
                state.escaped = false
                state.chars.push(c)
                return ['inSingleQuotes', state]
            },
            inDoubleQuotes: (c, state) => {
                if (c === '\\') {
                    state.escaped = true
                    return ['inDoubleQuotes', state]
                }
                if(!state.escaped && c === '"') {
                    state.parent[1].values.push({
                        inSingleQuotes: false,
                        value: state.chars.join('')
                    })
                    return state.parent
                }
                state.escaped = false
                state.chars.push(c)
                return ['inDoubleQuotes', state]
            }
        }, ['argument', { chars: [], values: [] }])

        console.log(value)

        value.replace(/(>+|<+)/g, ' $1 ').split('').forEach(char => {
          tokenizer.next(char)
        })

        tokenizer.next(' ')

        const variables = {}

        const args = []

        const paths = []

        const redirections = []

        let cmd = null

        // we can local variables before the cmd
        let beforeCmd = true;

        let isRedirectionTarget = false;
        let redirectionMode = '';

        tokens.forEach(token => {
            console.log(token)

            const isVariable = (beforeCmd && token[0].value.includes('=') && !token[0].inSingleQuotes)

            const isRedirection = (!token[0].inSingleQuotes && ['>','>>','<<','<'].includes(token[0].value))

            const str = token.map(element => {
                if(element.inSingleQuotes) {
                    return element.value
                }
                return environment.applyOnString(element.value, variables)
            }).join('')
            if(isVariable) {
                const parts = str.split('=')
                const varName = parts.shift()
                const varValue = parts.join('=')
                variables[varName] = { value: varValue }
            } else if (isRedirection) {
                redirectionMode = str
                isRedirectionTarget = true
            } else if (isRedirectionTarget) {
                isRedirectionTarget = false
                redirections.push({
                    mode: redirectionMode,
                    target: str
                })
            } else {
                // Unset beforeCmd, we could do a check if this is the first
                // argument, but that's not much more efficient.
                beforeCmd = false;
                args.push(str)
            }
        })

        console.log('args', args)

        console.log('variables', variables)

        console.log('redirections', redirections)

        return new Line(
            variables,
            args,
            redirections
        )
    }
}

export default Line
