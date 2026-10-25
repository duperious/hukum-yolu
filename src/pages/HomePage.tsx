import {
  ArrowRight,
  BookOpen,
  Crown,
  Download,
  Key,
  Lock,
  LogIn,
  Play,
  Plus,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
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
import { createRoom, joinRoom } from '../lib/multiplayer';
import { normalizeName, type Profile } from '../lib/profile';
import { isSupabaseConfigured } from '../lib/supabase';
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
    if (!isSupabaseConfigured) {
      toast.push(
        'Çok oyunculu mod için Supabase yapılandırması gerekli. Yerel test modu kullanılabilir.',
        'info',
      );
      return;
    }
    setModalError(null);
    setModal(mode);
  };

  const closeModal = () => {
    if (loading) return;
    setModal(null);
    setModalError(null);
  };

  const handleSubmit = async (nextProfile: Profile, roomCode: string) => {
    setLoading(true);
    setModalError(null);
    try {
      const result =
        modal === 'create'
          ? await createRoom({
              name: normalizeName(nextProfile.name),
              avatarId: nextProfile.avatarId,
            })
          : await joinRoom({
              roomCode,
              name: normalizeName(nextProfile.name),
              avatarId: nextProfile.avatarId,
            });

      const nextSession: MultiplayerSession = {
        roomCode: result.room.code,
        playerId: result.you.playerId,
        playerSecret: result.playerSecret,
        playerName: result.you.name,
        avatarId: result.you.avatarId,
        savedAt: Date.now(),
      };
      saveSession(nextSession);
      setSession(nextSession);
      setProfile(nextProfile);
      setModal(null);
      navigate(`/room/${result.room.code}`);
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
          <Link to="/setup" className="nav-link">
            <Key size={15} />
            Kurulum
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
              Gizli roller. Karanlık ittifaklar. Tek bir hüküm.
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
                disabled={!isSupabaseConfigured}
                title={
                  isSupabaseConfigured
                    ? undefined
                    : 'Çok oyunculu mod için Supabase yapılandırması gerekli.'
                }
              >
                Oyun Oluştur
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => openModal('join')}
                icon={<LogIn size={18} />}
                disabled={!isSupabaseConfigured}
                title={
                  isSupabaseConfigured
                    ? undefined
                    : 'Çok oyunculu mod için Supabase yapılandırması gerekli.'
                }
              >
                Odaya Katıl
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/local')}
                icon={<Play size={18} />}
              >
                Yerel Test Oyunu
              </Button>
            </div>

            <p className="home-hero__meta">
              <Users size={14} /> 5-10 oyuncu
              <span className="dot" />
              <Lock size={14} /> Gizli oylar
              <span className="dot" />
              <Smartphone size={14} /> Mobil öncelikli
            </p>
          </div>

          <div className="home-hero__art" aria-hidden="true">
            <div className="hero-seal">
              <span className="hero-seal__ring" />
              <span className="hero-seal__ring hero-seal__ring--inner" />
              <span className="hero-seal__icon">
                <Scale size={72} strokeWidth={1.1} />
              </span>
              <span className="hero-seal__crown">
                <Crown size={22} strokeWidth={1.4} />
              </span>
              <span className="hero-seal__label">HÜKÜM</span>
            </div>
            <div className="hero-orbit hero-orbit--one" />
            <div className="hero-orbit hero-orbit--two" />
          </div>
        </section>

        {!isSupabaseConfigured ? (
          <section className="setup-notice">
            <span className="setup-notice__icon">
              <ShieldCheck size={22} />
            </span>
            <div>
              <strong>Çok oyunculu mod yapılandırılmadı</strong>
              <p>
                Oda kurma ve arkadaşlarınla oynama için Supabase bağlantısı gerekir.
                Yerel test modu Supabase olmadan çalışır; botlara karşı hemen
                oynayabilirsin.
              </p>
            </div>
            <Link to="/setup" className="btn btn--outline btn--sm">
              Kurulumu Gör
              <ArrowRight size={15} />
            </Link>
          </section>
        ) : null}

        {session && isSupabaseConfigured ? (
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
                icon={<ArrowRight size={16} />}
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
            <h2>Sunucu doğrulamalı çok oyunculu</h2>
            <p>
              Oda durumu ve gizli roller sunucuda tutulur. Her istemciye yalnızca
              görmesi gereken veri gönderilir.
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
            <Sparkles size={22} />
          </span>
          <div>
            <h2>Masayı kurmaya hazır mısın?</h2>
            <p>Tek başına botlara karşı dene veya arkadaşlarınla oda kur.</p>
          </div>
          <div className="home-cta__actions">
            <Button variant="gold" onClick={() => navigate('/local')} icon={<Play size={16} />}>
              Yerel Test
            </Button>
            <Button
              variant="outline"
              onClick={() => openModal('create')}
              disabled={!isSupabaseConfigured}
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
          <Link to="/setup">Supabase Kurulumu</Link>
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
