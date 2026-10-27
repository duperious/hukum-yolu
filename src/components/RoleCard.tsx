import {
  Crown,
  Eye,
  Landmark,
  Scale,
  Sun,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import { ROLE_INFO, ROLE_NAMES } from '../game';
import type { PrivateView, PublicPlayer, Role, Team } from '../game';
import { cn } from '../lib/cn';
import { playerCardForRole } from './PlayerCards';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

const ROLE_ICONS: Record<string, LucideIcon> = {
  crown: Crown,
  swords: Swords,
  landmark: Landmark,
  scale: Scale,
  eye: Eye,
  sun: Sun,
};

const TEAM_LABELS: Record<Team, string> = {
  demokrat: 'Demokrat',
  otokrat: 'Otokrat',
  monarsi: 'Tarafsız',
};

function statusNotes(
  role: Role,
  view: PrivateView,
): Array<{ tone: 'gold' | 'blue' | 'red' | 'violet'; title: string; text: string }> {
  const notes: Array<{
    tone: 'gold' | 'blue' | 'red' | 'violet';
    title: string;
    text: string;
  }> = [];

  if (role === 'notr' && view.notrSide === 'mavi') {
    notes.push({
      tone: 'blue',
      title: 'Mavi tarafı seçtin',
      text: 'Demokrat takımıyla birlikte kazanırsın. Tarafın diğer oyuncular tarafından bilinmez.',
    });
  }
  if (role === 'notr' && view.notrSide === 'kirmizi') {
    notes.push({
      tone: 'red',
      title: 'Kırmızı tarafı seçtin',
      text: 'Otokratları destekliyorsun; ancak normal Otokrat zaferinde otomatik kazanmazsın. Liderliği devralırsan kişisel zafer koşulların açılır.',
    });
  }
  if (role === 'notr' && !view.notrSide && view.isAlive) {
    notes.push({
      tone: 'violet',
      title: 'Taraf seçimi bekleniyor',
      text: 'İlk üç reform tamamlandığında mavi veya kırmızı tarafı gizlice seçeceksin.',
    });
  }
  if (role === 'notr' && view.isLeader) {
    notes.push({
      tone: 'gold',
      title: 'Liderliği devraldın',
      text: 'Artık Demokrat Parti Başkanısın. Kişisel zafer için 7 Otokrat Reform, Başbakan seçilme veya tasfiye hedeflerini tamamla.',
    });
  }
  if (role === 'buyuk_vezir' && view.effectiveTeam === 'demokrat') {
    notes.push({
      tone: 'blue',
      title: 'Demokratik tarafa geçtin',
      text: 'Demokrat Parti Başkanı oldun. Oy gücün 1’e düştü. Demokratlarla birlikte kazanırsın.',
    });
  }
  if (role === 'buyuk_vezir' && view.votePower === 0) {
    notes.push({
      tone: 'red',
      title: 'Oy gücün kalıcı olarak 0',
      text: 'Bir oylamada engellendin. Bundan sonra oy gücün 0 kalacak.',
    });
  }
  if (role === 'buyuk_vezir' && view.effectiveTeam === 'monarsi' && view.isAlive) {
    notes.push({
      tone: 'gold',
      title: 'Monarşi görevlisi',
      text: 'İlk üç reform sonunda tarafın belirlenecek. Demokratlar öndeyse geçer, Otokratlar öndeyse idam edilirsin.',
    });
  }
  if (role === 'istihbarat_baskani' && view.canInvestigate) {
    notes.push({
      tone: 'blue',
      title: 'Soruşturma yetkin aktif',
      text: 'Bu tur bir oyuncuyu soruşturabilirsin. Sonuç yalnızca sana gösterilir.',
    });
  }
  if (!view.isAlive) {
    notes.push({
      tone: 'red',
      title: 'Öldün',
      text: 'Oyunu izlemeye devam ediyorsun. Oy kullanamaz, aday olamaz ve eylem yapamazsın; takımın kazanırsa sen de kazanırsın.',
    });
  }
  if (view.youWereBlocked) {
    notes.push({
      tone: 'red',
      title: 'Bu oylamada engellendin',
      text: 'Oy hakkın bu oylamada kullanılmadı. Büyük Vezirsen oy gücün kalıcı olarak 0 oldu.',
    });
  }

  return notes;
}

export function RoleCard({
  role,
  view,
  players,
  mode = 'inspect',
  onAcknowledge,
  acknowledged = false,
}: {
  role: Role;
  view: PrivateView;
  players: PublicPlayer[];
  mode?: 'reveal' | 'inspect';
  onAcknowledge?: () => void;
  acknowledged?: boolean;
}) {
  const info = ROLE_INFO[role];
  const card = playerCardForRole(role);
  const Icon = ROLE_ICONS[info.icon] ?? Scale;
  const notes = statusNotes(role, view);
  const playerById = new Map(players.map((player) => [player.id, player]));
  const investigationEntries = Object.entries(view.investigations);

  return (
    <article className={cn('role-card', `role-card--${info.accent}`)}>
      <div className="role-card__watermark" aria-hidden="true">
        <Icon size={220} strokeWidth={0.8} />
      </div>

      <header className="role-card__hero">
        <div className="role-card__identity">
          <div className="role-card__identity-head">
            <div>
              <p className="eyebrow">
                {mode === 'reveal' ? 'Gizli rolün' : 'Rol kartın'}
              </p>
              <h2 className="role-card__name">{info.name}</h2>
              <p className="role-card__team">{info.teamLabel}</p>
            </div>
            <span className="role-card__icon" aria-hidden="true">
              <Icon size={38} strokeWidth={1.5} />
            </span>
          </div>

          <section className="role-card__mission">
            <span className="role-card__mission-label">Görevin</span>
            <p>{info.mission}</p>
          </section>

          <p className="role-card__description">{info.description}</p>

          <div className="role-card__meta">
            <span className="chip">
              Şu anki taraf: <strong>{TEAM_LABELS[view.effectiveTeam]}</strong>
            </span>
            <span className="chip">
              Oy gücü: <strong>{view.votePower}</strong>
            </span>
            <span className="chip">
              Soruşturma:{' '}
              <strong>{info.investigation === 'kotu' ? 'Kötü' : 'İyi'}</strong>
            </span>
          </div>
        </div>

        <figure className={`role-card__card role-card__card--${card.team}`}>
          <div className="role-card__card-frame">
            <img
              src={card.image}
              alt={`${card.teamLabel} ${card.name} oyuncu kartı`}
              width={324}
              height={454}
              loading={mode === 'reveal' ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          </div>
          <figcaption>
            <span>Oyuncu kartın</span>
            <strong>{card.name}</strong>
            <small>{card.note}</small>
          </figcaption>
        </figure>
      </header>

      <section className="role-card__section">
        <h3>Yeteneklerin</h3>
        <ul className="role-card__list">
          {info.abilities.map((ability) => (
            <li key={ability}>{ability}</li>
          ))}
        </ul>
      </section>

      <section className="role-card__section">
        <h3>Bildiklerin</h3>
        {view.knownPlayers.length > 0 ? (
          <ul className="known-list">
            {view.knownPlayers.map((known) => {
              const player = playerById.get(known.id);
              return (
                <li key={known.id} className="known-list__item">
                  <Avatar avatarId={player?.avatarId ?? 'avatar-1'} size="sm" />
                  <div>
                    <strong>{known.name}</strong>
                    <span>{ROLE_NAMES[known.role]}</span>
                  </div>
                  {!player?.alive ? <span className="known-list__dead">Ölü</span> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">
            Bu rolde özel bir gizli oyuncu bilgisi yok. Çıkarımını oylar, hükümetler ve
            reformlar üzerinden yapmalısın.
          </p>
        )}
      </section>

      {investigationEntries.length > 0 ? (
        <section className="role-card__section">
          <h3>Soruşturma notların</h3>
          <ul className="investigation-list">
            {investigationEntries.map(([playerId, result]) => {
              const player = playerById.get(playerId);
              return (
                <li key={playerId} className={`investigation-list__item investigation-list__item--${result}`}>
                  <span>{player?.name ?? 'Bilinmeyen oyuncu'}</span>
                  <strong>{result === 'kotu' ? 'Kötü' : 'İyi'}</strong>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {notes.length > 0 ? (
        <section className="role-card__section">
          <h3>Özel durumlar</h3>
          <div className="status-notes">
            {notes.map((note) => (
              <div key={`${note.title}-${note.text}`} className={`status-note status-note--${note.tone}`}>
                <strong>{note.title}</strong>
                <p>{note.text}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="role-card__footer">
        <p className="role-card__privacy">
          Bu kartı yalnızca sen görmelisin. Ekranı başkalarına göstermeden kapat.
        </p>
        {mode === 'reveal' && onAcknowledge ? (
          <Button
            variant="gold"
            size="lg"
            fullWidth
            onClick={onAcknowledge}
            disabled={acknowledged}
          >
            {acknowledged ? 'Rolün onaylandı' : 'Rolümü Anladım'}
          </Button>
        ) : null}
      </footer>
    </article>
  );
}
