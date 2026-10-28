import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Logo } from './ui/Logo';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

/**
 * Beklenmeyen bir render hatasında beyaz ekran yerine anlaşılır bir
 * kurtarma ekranı gösterir. Sayfayı yenilemek genellikle sorunu çözer;
 * oyun sırasında yenileme oturumu lobiye döndürebilir.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message:
        error instanceof Error
          ? error.message
          : 'Bilinmeyen bir arayüz hatası oluştu.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Geliştirici konsolunda iz bırak; kullanıcıya teknik yığın gösterme.
    console.error('Hüküm Yolu arayüz hatası:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="error-screen">
        <div className="error-screen__card">
          <Logo linked={false} />
          <span className="error-screen__icon" aria-hidden="true">
            <AlertTriangle size={28} />
          </span>
          <h1>Bir şeyler ters gitti</h1>
          <p>
            Arayüz beklenmeyen bir hatayla karşılaştı. Sayfayı yenilemek
            genellikle sorunu çözer. Oyun sırasında yenileme oturumun lobiye
            dönmesine neden olabilir.
          </p>
          {this.state.message ? (
            <code className="error-screen__detail">{this.state.message}</code>
          ) : null}
          <div className="error-screen__actions">
            <button
              type="button"
              className="btn btn--primary btn--md"
              onClick={() => window.location.reload()}
            >
              <span className="btn__icon" aria-hidden="true">
                <RefreshCw size={17} />
              </span>
              <span className="btn__label">Sayfayı Yenile</span>
            </button>
            <a className="btn btn--outline btn--md" href="./#/">
              <span className="btn__label">Ana Sayfa</span>
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
