import { Component } from 'react';
import { t, DEFAULT_LANGUAGE } from '../i18n/index.js';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const lang = this.props.language || DEFAULT_LANGUAGE;
      return (
        <div className="ns-error-boundary" role="alert">
          <h1>{t(lang, 'errorBoundaryTitle')}</h1>
          <p>{t(lang, 'errorBoundaryMessage')}</p>
          <button
            type="button"
            className="ns-btn ns-btn-primary"
            onClick={this.handleRetry}
          >
            {t(lang, 'errorBoundaryRetry')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

