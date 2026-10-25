import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <header className="site-nav">
        <Logo />
      </header>
      <main className="not-found">
        <span className="not-found__icon" aria-hidden="true">
          <Compass size={38} />
        </span>
        <p className="eyebrow">404</p>
        <h1>Bu yol kapalı</h1>
        <p>
          Aradığın sayfa bulunamadı. Belki oda kodu yanlış, belki de bu sayfa
          hiç var olmadı.
        </p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn--gold btn--lg">
            <span className="btn__icon" aria-hidden="true">
              <ArrowLeft size={18} />
            </span>
            <span className="btn__label">Ana Sayfaya Dön</span>
          </Link>
          <Link to="/guide" className="btn btn--outline btn--lg">
            <span className="btn__label">Nasıl Oynanır?</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
