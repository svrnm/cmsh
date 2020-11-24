class StateMachine {

  constructor(states, initialState) {
    this.states = states
    this.state = states[initialState]
    this.data = {}
  }

  static initalize(states, initialState) {
    return new StateMachine(states, initialState)
  }

  next(token) {
    const result = this.state(token, this.data)

    // console.log(token, this.data, result)

    const nextState = Array.isArray(result) ? result[0] : result

    const nextData = Array.isArray(result) && result.length > 1 ? result[1] : {}

    this.state = this.states[nextState]
    this.data = nextData

  }
}

export default StateMachine
