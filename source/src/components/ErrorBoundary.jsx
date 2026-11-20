import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }

  handleReset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div className="crash">
          <div className="crash__panel">
            <div className="crash__title">Что-то пошло не так</div>
            <div className="crash__msg">{String(this.state.error?.message || this.state.error)}</div>
            <button className="crash__btn" onClick={this.handleReset}>
              Попробовать снова
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
