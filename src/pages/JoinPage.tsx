import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Key,
  LogIn,
  Play,
  Wifi,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProfileForm } from '../components/ProfileForm';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { useProfile } from '../hooks/useProfile';
import { normalizeName, validateName } from '../lib/profile';
import {
  clearSession,
  loadSession,
  saveSession,
  type MultiplayerSession,
} from '../lib/storage';
import {
  normalizeRoomCode,
  roomCodeError,
} from '../lib/validation';

export default function JoinPage() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { profile, setProfile } = useProfile();
  const [roomCode, setRoomCode] = useState(() => normalizeRoomCode(code ?? ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<MultiplayerSession | null>(() =>
    loadSession(),
  );

  useEffect(() => {
    setRoomCode(normalizeRoomCode(code ?? ''));
    setError(null);
  }, [code]);

  const removeSession = () => {
    clearSession();
    setSession(null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nameError = validateName(profile.name);
    if (nameError) {
      setError(nameError);
      return;
    }
    const codeError = roomCodeError(roomCode);
    if (codeError) {
      setError(codeError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextSession = {
        roomCode,
        playerName: normalizeName(profile.name),
        avatarId: profile.avatarId,
        isHost: false,
      };
      saveSession(nextSession);
      setSession({ ...nextSession, savedAt: Date.now() });
      setProfile({ ...profile, name: normalizeName(profile.name) });
      navigate(`/room/${roomCode}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Odaya katılınamadı. Lütfen tekrar deneyin.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-page">
      <header className="site-nav">
        <Logo />
        <nav className="site-nav__links">
          <Link to="/guide" className="nav-link">
            <BookOpen size={15} />
            Nasıl Oynanır?
          </Link>
          <Link to="/" className="nav-link">
            <ArrowLeft size={15} />
            Ana Sayfa
          </Link>
        </nav>
      </header>

      <main className="join-main">
        <section className="join-hero">
          <p className="eyebrow">Davet</p>
          <h1>Odaya katıl</h1>
          <p>
            Oda kodunu ve profilini gir. Oda lobideyse hemen içeri alınırsın.
            Oyun başladıysa yeni oyuncu kabul edilmez.
          </p>
        </section>

        <div className="setup-notice setup-notice--compact">
          <span className="setup-notice__icon">
            <Wifi size={20} />
          </span>
          <div>
            <strong>Doğrudan bağlantı</strong>
            <p>
              Oda sahibinin sekmesi açık olmalı. Bağlantı WebRTC üzerinden
              kurulur; ayrı bir sunucu gerekmez.
            </p>
          </div>
          <Link to="/setup" className="text-link">
            Nasıl çalışır?
          </Link>
        </div>

        {session ? (
          <section className="session-notice">
            <Avatar avatarId={session.avatarId} size="md" ring="gold" />
            <div>
              <p className="eyebrow">Bu cihazda kayıtlı oturum</p>
              <strong>{session.roomCode} odasında {session.playerName}</strong>
              <span className="muted">
                Yeni bir odaya katılırsan bu cihazdaki oda oturumu değişir.
              </span>
            </div>
            <div className="session-notice__actions">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/room/${session.roomCode}`)}
              >
                Mevcut odaya dön
              </Button>
              <button type="button" className="text-btn" onClick={removeSession}>
                Oturumu kaldır
              </button>
            </div>
          </section>
        ) : null}

        <section className="panel join-card">
          <header className="panel__header">
            <div>
              <p className="eyebrow">Giriş</p>
              <h2 className="panel__title">Oda ve profil</h2>
            </div>
            <span className="chip">
              <Users size={13} /> 5-10 oyuncu
            </span>
          </header>

          {error ? (
            <div className="form-alert form-alert--error" role="alert">
              <AlertTriangle size={16} />
              <span>{error}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setError(null)}
                aria-label="Hatayı kapat"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}

          <form className="stack" onSubmit={handleSubmit}>
            <div className="field">
              <div className="field__label-row">
                <label className="field__label" htmlFor="join-code">
                  Oda kodu
                </label>
                <span className="field__hint">{roomCode.length}/6</span>
              </div>
              <input
                id="join-code"
                className="input input--code input--code-large"
                value={roomCode}
                onChange={(event) => {
                  setRoomCode(normalizeRoomCode(event.target.value));
                  setError(null);
                }}
                placeholder="ABC234"
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                autoFocus={!roomCode}
                disabled={loading}
              />
              <p className="field__hint">
                <Key size={12} /> 6 karakter. Karıştırılan I, O, 0 ve 1 kullanılmaz.
              </p>
            </div>

            <ProfileForm
              value={profile}
              onChange={(next) => {
                setProfile(next);
                setError(null);
              }}
              disabled={loading}
              autoFocus={Boolean(roomCode)}
            />

            <Button
              type="submit"
              variant="gold"
              size="lg"
              fullWidth
              loading={loading}
              icon={<LogIn size={18} />}
            >
              Odaya Katıl
            </Button>
          </form>

          <div className="join-card__footer">
            <p className="muted">
              Oda yok mu? Ana sayfadan kendi odanı kurabilirsin.
            </p>
            <div className="join-card__links">
              <Link to="/" className="text-link">
                Oda kur
              </Link>
              <Link to="/local" className="text-link">
                <Play size={14} /> Yerel test
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
