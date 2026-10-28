import {
  BookOpen,
  Download,
  Gavel,
  Lock,
  LogIn,
  Plus,
  Smartphone,
  Users,
  Wifi,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProfileModal } from '../components/ProfileModal';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useProfile } from '../hooks/useProfile';
import { useToast } from '../components/ui/Toast';
import { normalizeName, type Profile } from '../lib/profile';
import { makeRoomCode } from '../net/roomCode';
import { normalizeRoomCode } from '../lib/validation';
import {
  clearSession,
  loadSession,
  saveSession,
  type MultiplayerSession,
} from '../lib/storage';

export default function HomePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, setProfile } = useProfile();
  const { canInstall, promptInstall } = useInstallPrompt();
  const [modal, setModal] = useState<'create' | 'join' | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [session, setSession] = useState<MultiplayerSession | null>(() => loadSession());

  const openModal = (mode: 'create' | 'join') => {
    setModalError(null);
    setModal(mode);
  };

  const closeModal = () => {
    if (loading) return;
    setModal(null);
    setModalError(null);
  };

  const handleSubmit = (nextProfile: Profile, roomCode: string) => {
    setLoading(true);
    setModalError(null);
    try {
      const code = modal === 'create' ? makeRoomCode() : normalizeRoomCode(roomCode);
      if (modal === 'join' && code.length !== 6) {
        setModalError('Oda kodu 6 karakter olmalı.');
        return;
      }
      const nextSession = {
        roomCode: code,
        playerName: normalizeName(nextProfile.name),
        avatarId: nextProfile.avatarId,
        isHost: modal === 'create',
      };
      saveSession(nextSession);
      setSession({ ...nextSession, savedAt: Date.now() });
      setProfile(nextProfile);
      setModal(null);
      navigate(`/room/${code}`);
    } catch (caught) {
      setModalError(
        caught instanceof Error
          ? caught.message
          : 'Oda işlemi tamamlanamadı. Lütfen tekrar deneyin.',
      );
    } finally {
      setLoading(false);
    }
  };

  const removeResume = () => {
    clearSession();
    setSession(null);
    toast.push('Kayıtlı oda oturumu kaldırıldı.', 'info');
  };

  return (
    <div className="home-page">
      <header className="site-nav">
        <Logo />
        <nav className="site-nav__links" aria-label="Ana menü">
          <Link to="/guide" className="nav-link">
            <BookOpen size={15} />
            Nasıl Oynanır?
          </Link>
          {canInstall ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void promptInstall()}
              icon={<Download size={15} />}
            >
              Uygulamayı Yükle
            </Button>
          ) : null}
        </nav>
      </header>

      <main>
        <section className="home-hero">
          <div className="home-hero__content">
            <div className="home-hero__eyebrow">
              <span className="gold-rule" />
              <span>Sosyal çıkarım oyunu</span>
            </div>
            <h1 className="home-hero__title">
              HÜKÜM
              <span>YOLU</span>
            </h1>
            <p className="home-hero__subtitle">
              Gizli roller, karanlık ittifaklar ve tek bir hüküm.
            </p>
            <p className="home-hero__description">
              5-10 oyuncuyla oynanan, politik gerilimli bir sosyal çıkarım oyunu.
              Rollerini gizle, hükümetler kur, reformları yönlendir ve masadaki
              yalanları çöz.
            </p>

            <div className="home-actions">
              <Button
                variant="gold"
                size="lg"
                onClick={() => openModal('create')}
                icon={<Plus size={18} />}
              >
                Oyun Oluştur
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => openModal('join')}
                icon={<LogIn size={18} />}
              >
                Odaya Katıl
              </Button>
            </div>

            <p className="home-hero__meta">
              <span>
                <Users size={14} /> 5-10 oyuncu
              </span>
              <span>
                <Lock size={14} /> Gizli oylar
              </span>
              <span>
                <Smartphone size={14} /> Mobil öncelikli
              </span>
            </p>
          </div>

          <div className="home-hero__art" aria-hidden="true">
            <div className="hero-dossier">
              <span className="hero-dossier__tab">Mazbata</span>
              <div className="hero-dossier__head">
                <span>Hüküm Yolu</span>
                <span>No. 03 / 06</span>
              </div>
              <div className="hero-dossier__rule" />
              <p className="hero-dossier__kicker">Hükümet tevdi belgesi</p>
              <p className="hero-dossier__title">
                Masa
                <br />
                tutanağı
              </p>
              <dl className="hero-dossier__rows">
                <div>
                  <dt>Masa</dt>
                  <dd>5–10 oyuncu</dd>
                </div>
                <div>
                  <dt>Oy</dt>
                  <dd>Gizli</dd>
                </div>
                <div>
                  <dt>Hüküm</dt>
                  <dd>Kesin</dd>
                </div>
              </dl>
              <div className="hero-stamp">
                <span>Hüküm</span>
                <strong>Yolu</strong>
                <small>Onaylandı</small>
              </div>
              <div className="hero-dossier__foot">
                <span>Kayıt altına alınmıştır</span>
                <span>Dönem 01</span>
              </div>
            </div>
          </div>
        </section>

        <section className="setup-notice">
          <span className="setup-notice__icon">
            <Wifi size={22} />
          </span>
          <div>
            <strong>Sunucusuz online: oda sahibi tarayıcısı</strong>
            <p>
              Oda sahibinin sekmesi açık kaldığı sürece arkadaşlarınla doğrudan
              WebRTC üzerinden oynayabilirsin. Ek bir sunucu veya veritabanı
              gerekmez; oda sahibi teknik olarak tüm rolleri görebilir.
            </p>
          </div>
        </section>

        {session ? (
          <section className="resume-card">
            <div className="resume-card__identity">
              <Avatar avatarId={session.avatarId} size="lg" ring="gold" />
              <div>
                <p className="eyebrow">Devam eden oda</p>
                <strong className="resume-card__code">{session.roomCode}</strong>
                <span className="muted">{session.playerName} olarak kayıtlı</span>
              </div>
            </div>
            <div className="resume-card__actions">
              <Button
                variant="primary"
                onClick={() => navigate(`/room/${session.roomCode}`)}
              >
                Odaya Dön
              </Button>
              <button type="button" className="text-btn" onClick={removeResume}>
                Oturumu kaldır
              </button>
            </div>
          </section>
        ) : null}

        <section className="home-features">
          <article className="feature-card">
            <span className="feature-card__icon feature-card__icon--violet">
              <Lock size={20} />
            </span>
            <h2>Gizli roller, gizli oylar</h2>
            <p>
              Her oyuncu yalnızca kendi rolünü ve kuralların izin verdiği bilgileri
              görür. Oyların tek tek kimin verdiği açıklanmaz.
            </p>
          </article>
          <article className="feature-card">
            <span className="feature-card__icon feature-card__icon--blue">
              <Wifi size={20} />
            </span>
            <h2>Oda sahibi yönetir, herkes kendi görünümünü alır</h2>
            <p>
              Oyun durumu oda sahibinin tarayıcısında tutulur; her oyuncuya
              yalnızca görmesi gereken filtrelenmiş görünüm gönderilir. Oda
              sahibinin sekmesi açık kalmalıdır.
            </p>
          </article>
          <article className="feature-card">
            <span className="feature-card__icon feature-card__icon--gold">
              <Smartphone size={20} />
            </span>
            <h2>Telefonda masaya hazır</h2>
            <p>
              Mobil öncelikli arayüz, PWA desteği ve çevrimdışı uygulama kabuğu.
              Tarayıcıdan aç, ana ekrana ekle.
            </p>
          </article>
        </section>

        <section className="home-steps">
          <div className="home-steps__intro">
            <p className="eyebrow">Nasıl işler?</p>
            <h2>Üç adımda hüküm</h2>
            <p>
              Rollerini al, hükümetleri kur, reformları yönlendir. Masadaki
              çoğunluk kadar, kimin ne bildiği de önemli.
            </p>
            <Link to="/guide" className="text-link">
              <BookOpen size={15} /> Tüm kuralları oku
            </Link>
          </div>
          <div className="home-steps__list">
            <article className="step-card">
              <span className="step-card__number">01</span>
              <h3>Rollerini al</h3>
              <p>
                Otokratlar, Demokratlar, Büyük Vezir ve Nötr. Herkes gizli rolünü
                öğrenir; bazı roller takım arkadaşlarını tanır.
              </p>
            </article>
            <article className="step-card">
              <span className="step-card__number">02</span>
              <h3>Hükümet kur</h3>
              <p>
                Başkan bir Başbakan adayı gösterir. Masa gizli oyla karar verir. Üç
                üst üste ret, destenin üst kartını otomatik yürürlüğe sokar.
              </p>
            </article>
            <article className="step-card">
              <span className="step-card__number">03</span>
              <h3>Reformları yönlendir</h3>
              <p>
                Altı Demokratik Reform Demokratları, yedi Otokrat Reform Otokratları
                zafere taşır. Suikastlar ve özel yetkiler dengeleri değiştirir.
              </p>
            </article>
          </div>
        </section>

        <section className="home-cta">
          <span className="home-cta__icon">
            <Gavel size={22} />
          </span>
          <div>
            <h2>Masayı kurmaya hazır mısın?</h2>
            <p>Arkadaşlarınla çok oyunculu bir oda kur.</p>
          </div>
          <div className="home-cta__actions">
            <Button
              variant="gold"
              onClick={() => openModal('create')}
              icon={<Plus size={16} />}
            >
              Oda Kur
            </Button>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <Logo compact linked={false} />
        <p>Özgün bir sosyal çıkarım oyunu. Gizli roller, açık hesaplaşmalar.</p>
        <div className="site-footer__links">
          <Link to="/guide">Nasıl Oynanır?</Link>
        </div>
      </footer>

      <ProfileModal
        open={modal !== null}
        onClose={closeModal}
        mode={modal ?? 'create'}
        initialProfile={profile}
        onSubmit={handleSubmit}
        loading={loading}
        error={modalError}
      />
    </div>
  );
}
