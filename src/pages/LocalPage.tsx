import { ArrowLeft, Bot, Info, Play, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GameScreen } from '../components/GameScreen';
import { ProfileForm } from '../components/ProfileForm';
import { RoleComposition } from '../components/RoleComposition';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { useLocalGame } from '../hooks/useLocalGame';
import { useProfile } from '../hooks/useProfile';
import { normalizeName, validateName } from '../lib/profile';

export default function LocalPage() {
  const navigate = useNavigate();
  const { profile, setProfile } = useProfile();
  const game = useLocalGame();
  const [botCount, setBotCount] = useState(4);
  const [startError, setStartError] = useState<string | null>(null);

  const totalPlayers = botCount + 1;

  const handleStart = () => {
    const nameError = validateName(profile.name);
    if (nameError) {
      setStartError(nameError);
      return;
    }
    const normalized = { ...profile, name: normalizeName(profile.name) };
    setStartError(null);
    setProfile(normalized);
    game.start(normalized, botCount);
  };

  const handleLeave = () => {
    game.reset();
    navigate('/');
  };

  if (game.redacted && game.viewerId) {
    return (
      <GameScreen
        redacted={game.redacted}
        viewerId={game.viewerId}
        mode="local"
        onAction={game.act}
        onLeave={handleLeave}
        onRestart={game.restart}
        actionPending={false}
        error={game.error}
        onDismissError={game.clearError}
      />
    );
  }

  return (
    <div className="local-page">
      <header className="site-nav">
        <Logo />
        <Link to="/" className="nav-link">
          <ArrowLeft size={15} />
          Ana Sayfa
        </Link>
      </header>

      <main className="local-main">
        <section className="local-hero">
          <p className="eyebrow">Supabase gerekmez</p>
          <h1>Yerel test oyunu</h1>
          <p>
            Botlara karşı tek başına oyna. Profilini seç, bot sayısını ayarla ve
            kuralları keşfet. Bu mod tamamen tarayıcında çalışır; oda kurmak veya
            hesap açmak gerekmez.
          </p>
          <div className="local-hero__chips">
            <span className="chip">
              <Users size={13} /> 1 insan + botlar
            </span>
            <span className="chip">
              <ShieldCheck size={13} /> Gizli roller
            </span>
            <span className="chip">
              <Bot size={13} /> Yapay zekâ botları
            </span>
          </div>
        </section>

        <div className="local-layout">
          <section className="panel local-form-card">
            <header className="panel__header">
              <div>
                <p className="eyebrow">Oyuncu</p>
                <h2 className="panel__title">Profilin</h2>
              </div>
            </header>

            {startError ? (
              <div className="form-alert form-alert--error" role="alert">
                {startError}
              </div>
            ) : null}

            <ProfileForm
              value={profile}
              onChange={(next) => {
                setProfile(next);
                setStartError(null);
              }}
              autoFocus
            />

            <div className="bot-count">
              <div className="bot-count__header">
                <div>
                  <p className="eyebrow">Masa</p>
                  <h3>Bot sayısı</h3>
                </div>
                <span className="bot-count__value">
                  {botCount} bot · {totalPlayers} oyuncu
                </span>
              </div>
              <input
                className="bot-count__range"
                type="range"
                min={4}
                max={9}
                step={1}
                value={botCount}
                onChange={(event) => setBotCount(Number(event.target.value))}
                aria-label="Bot sayısı"
              />
              <div className="bot-count__labels" aria-hidden="true">
                <span>4 bot · 5 oyuncu</span>
                <span>9 bot · 10 oyuncu</span>
              </div>
            </div>

            <div className="local-start">
              <Button
                variant="gold"
                size="lg"
                fullWidth
                onClick={handleStart}
                icon={<Play size={18} />}
              >
                Oyunu Başlat
              </Button>
              <p className="local-note">
                <Info size={13} /> Botlar yalnızca herkese açık bilgileri ve kendi
                rolleriyle ilgili gizli bilgileri kullanır. Gizli bilgilerini
                oyun günlüğüne yazmazlar.
              </p>
            </div>
          </section>

          <aside className="local-aside">
            <section className="panel">
              <header className="panel__header">
                <div>
                  <p className="eyebrow">Bu masa</p>
                  <h2 className="panel__title">Rol dağılımı</h2>
                </div>
              </header>
              <RoleComposition totalPlayers={totalPlayers} />
              <p className="muted">
                Roller oyun başlarken rastgele dağıtılır. 5-10 oyuncu arasındaki
                dağılım sabittir; botlar eksik oyuncuları doldurur.
              </p>
            </section>

            <section className="panel local-tips">
              <h2 className="panel__title">Yerel test ipuçları</h2>
              <ul className="rule-list">
                <li>Rol kartını yalnızca sen görürsün; onayladıktan sonra oyun başlar.</li>
                <li>Botlar Başkan olduğunda aday gösterir, oy verir ve reform seçer.</li>
                <li>Oyun sonunda tüm roller ve kazananlar açıklanır.</li>
                <li>Yerel oyun bu cihazda saklanmaz; sayfayı yenilersen sıfırlanır.</li>
              </ul>
              <Link to="/guide" className="text-link">
                Kuralları ve varsayımları oku
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
