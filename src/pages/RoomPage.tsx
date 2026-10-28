import {
  AlertTriangle,
  ArrowLeft,
  Home,
  LogIn,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GameScreen } from '../components/GameScreen';
import { LobbyView } from '../components/LobbyView';
import { ProfileModal } from '../components/ProfileModal';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { Spinner } from '../components/ui/Spinner';
import { useMultiplayerRoom } from '../hooks/useMultiplayerRoom';
import { normalizeName, type Profile } from '../lib/profile';
import { loadSession } from '../lib/storage';
import { normalizeRoomCode } from '../lib/validation';

function StatusShell({
  children,
  eyebrow = 'Oda',
  title,
  description,
  icon,
  actions,
}: {
  children?: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="status-page">
      <header className="site-nav">
        <Logo />
        <Link to="/" className="nav-link">
          <ArrowLeft size={15} />
          Ana Sayfa
        </Link>
      </header>
      <main className="status-card panel">
        {icon ? <span className="status-card__icon">{icon}</span> : null}
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
        <div className="status-card__actions">{actions}</div>
      </main>
    </div>
  );
}

export default function RoomPage() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const normalizedCode = normalizeRoomCode(code ?? '');
  const [session] = useState(() => loadSession());
  const [editOpen, setEditOpen] = useState(false);

  const validSession =
    session && session.roomCode === normalizedCode ? session : null;
  const room = useMultiplayerRoom(validSession);
  const snapshot = room.snapshot;

  useEffect(() => {
    if (snapshot && snapshot.room.status !== 'lobby' && editOpen) {
      setEditOpen(false);
    }
  }, [editOpen, snapshot]);

  const handleLeave = async () => {
    await room.leave();
    navigate('/');
  };

  const handleEditProfile = (profile: Profile) => {
    void room.sendLobby({
      type: 'update_profile',
      name: normalizeName(profile.name),
      avatarId: profile.avatarId,
    });
    setEditOpen(false);
  };

  if (!validSession) {
    return (
      <StatusShell
        eyebrow="Oturum"
        title="Bu odaya bu cihazdan katılmadın"
        description={`${normalizedCode || 'Bu oda'} için kayıtlı bir oyuncu oturumu bulunamadı. Odaya katılmak için davet bağlantısını veya oda kodunu kullan.`}
        icon={<LogIn size={28} />}
        actions={
          <>
            <Link
              to={normalizedCode ? `/join/${normalizedCode}` : '/join'}
              className="btn btn--gold btn--md"
            >
              <span className="btn__label">Odaya Katıl</span>
            </Link>
            <Link to="/" className="btn btn--outline btn--md">
              <span className="btn__label">Ana Sayfa</span>
            </Link>
          </>
        }
      />
    );
  }

  if (room.loading) {
    return (
      <div className="status-page">
        <header className="site-nav">
          <Logo />
        </header>
        <main className="status-card panel status-card--center">
          <Spinner size={30} label="Odaya bağlanılıyor" />
          <h1>Odaya bağlanılıyor</h1>
          <p className="muted">Oda durumu ve gizli görünümün getiriliyor.</p>
        </main>
      </div>
    );
  }

  if (room.fatalError) {
    return (
      <StatusShell
        eyebrow="Bağlantı"
        title="Odaya bağlanılamadı"
        description={room.fatalError}
        icon={<WifiOff size={28} />}
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => void room.refresh()}
              icon={<RefreshCw size={16} />}
            >
              Yeniden Dene
            </Button>
            <Link
              to={normalizedCode ? `/join/${normalizedCode}` : '/join'}
              className="btn btn--outline btn--md"
            >
              <span className="btn__label">Odaya Katıl</span>
            </Link>
            <Link to="/" className="btn btn--ghost btn--md">
              <span className="btn__label">Ana Sayfa</span>
            </Link>
          </>
        }
      />
    );
  }

  if (!snapshot) {
    return (
      <StatusShell
        eyebrow="Bağlantı"
        title="Oda durumu alınamadı"
        description={
          room.error ??
          'Oda sahibinden oda bilgisi alınamadı. Bağlantını kontrol edip yeniden dene.'
        }
        icon={<AlertTriangle size={28} />}
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => void room.refresh()}
              icon={<RefreshCw size={16} />}
            >
              Yeniden Dene
            </Button>
            <Link to="/" className="btn btn--ghost btn--md">
              <span className="btn__label">Ana Sayfa</span>
            </Link>
          </>
        }
      />
    );
  }

  const initialProfile: Profile = {
    name: snapshot.you.name,
    avatarId: snapshot.you.avatarId,
  };

  if (snapshot.room.status === 'lobby' && snapshot.lobby) {
    return (
      <>
        <LobbyView
          snapshot={snapshot}
          connection={room.connection}
          actionPending={room.actionPending}
          error={room.error}
          onDismissError={room.dismissError}
          onLobbyAction={room.sendLobby}
          onClaimHost={room.claimHost}
          onLeave={() => void handleLeave()}
          onEditProfile={() => setEditOpen(true)}
        />
        <ProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          mode="edit"
          initialProfile={initialProfile}
          onSubmit={handleEditProfile}
          loading={room.actionPending}
        />
      </>
    );
  }

  if (snapshot.game) {
    return (
      <>
        <GameScreen
          redacted={snapshot.game}
          viewerId={snapshot.you.playerId}
          roomCode={snapshot.room.code}
          connection={room.connection}
          actionPending={room.actionPending}
          error={room.error}
          onDismissError={room.dismissError}
          onAction={room.sendGame}
          onLeave={() => void handleLeave()}
          onRestart={snapshot.you.isHost ? room.restart : undefined}
          restartPending={room.actionPending}
          isHost={snapshot.you.isHost}
        />
        <ProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          mode="edit"
          initialProfile={initialProfile}
          onSubmit={handleEditProfile}
          loading={room.actionPending}
        />
      </>
    );
  }

  return (
    <StatusShell
      eyebrow="Oyun"
      title="Oyun durumu hazırlanıyor"
      description="Oda oyun moduna geçti ancak oyun durumu henüz gelmedi. Birkaç saniye içinde otomatik olarak yenilenecek."
      icon={<RefreshCw size={28} className="spin" />}
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => void room.refresh()}
            icon={<RefreshCw size={16} />}
          >
            Yenile
          </Button>
          <Link to="/" className="btn btn--ghost btn--md">
            <span className="btn__label">
              <Home size={15} /> Ana Sayfa
            </span>
          </Link>
        </>
      }
    />
  );
}
