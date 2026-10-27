import { ArrowRight, IdCard, X } from 'lucide-react';
import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import buyukVezirArt from '../assets/cards/buyuk-vezir.jpg';
import demokratBaskanArt from '../assets/cards/demokrat-parti-baskani.jpg';
import demokratUyeArt from '../assets/cards/demokrat-parti-uyesi.jpg';
import istihbaratArt from '../assets/cards/istihbarat-baskani.jpg';
import kararsizArt from '../assets/cards/kararsiz.jpg';
import otokratBaskanArt from '../assets/cards/otokrat-parti-baskani.jpg';
import otokratUyeArt from '../assets/cards/otokrat-parti-uyesi.jpg';
import { Button } from './ui/Button';

type PlayerCardTeam = 'demokrat' | 'otokrat' | 'tarafsiz';

export interface PlayerCardInfo {
  id: string;
  name: string;
  team: PlayerCardTeam;
  teamLabel: string;
  note: string;
  image: string;
}

export const PLAYER_CARDS: PlayerCardInfo[] = [
  {
    id: 'istihbarat-baskani',
    name: 'İstihbarat Başkanı',
    team: 'demokrat',
    teamLabel: 'Demokrat',
    note: 'Gizli soruşturma yetkisi',
    image: istihbaratArt,
  },
  {
    id: 'demokrat-parti-baskani',
    name: 'Parti Başkanı',
    team: 'demokrat',
    teamLabel: 'Demokrat',
    note: 'Demokratların lider makamı',
    image: demokratBaskanArt,
  },
  {
    id: 'demokrat-parti-uyesi',
    name: 'Parti Üyesi',
    team: 'demokrat',
    teamLabel: 'Demokrat',
    note: 'Demokratik cephenin üyesi',
    image: demokratUyeArt,
  },
  {
    id: 'otokrat-parti-baskani',
    name: 'Parti Başkanı',
    team: 'otokrat',
    teamLabel: 'Otokrat',
    note: 'Otokrat Lider',
    image: otokratBaskanArt,
  },
  {
    id: 'otokrat-parti-uyesi',
    name: 'Parti Üyesi',
    team: 'otokrat',
    teamLabel: 'Otokrat',
    note: 'Otokrat takımının üyesi',
    image: otokratUyeArt,
  },
  {
    id: 'kararsiz',
    name: 'Kararsız',
    team: 'tarafsiz',
    teamLabel: 'Tarafsız',
    note: 'İlk üç reformdan sonra taraf seçer',
    image: kararsizArt,
  },
  {
    id: 'buyuk-vezir',
    name: 'Büyük Vezir',
    team: 'tarafsiz',
    teamLabel: 'Tarafsız',
    note: 'İki oy gücüne sahip saray görevlisi',
    image: buyukVezirArt,
  },
];

export function PlayerCardGallery({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="player-cards-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="player-cards-sheet">
        <div className="player-cards-sheet__topbar">
          <span className="player-cards-sheet__hint">
            <IdCard size={13} /> Masa kâğıtları · {PLAYER_CARDS.length} kart
          </span>
          <button
            type="button"
            className="icon-btn player-cards-sheet__close"
            onClick={onClose}
            aria-label="Oyuncu kartlarını kapat"
          >
            <X size={20} />
          </button>
        </div>

        <header className="player-cards-sheet__header">
          <div>
            <p className="player-cards-sheet__kicker">Oyuncu kartları</p>
            <h2 id={titleId}>Her rolün bir kartı var</h2>
            <p>
              Bu masadaki rolleri temsil eden kartlar. Kartlar yalnızca rolleri
              tanıtır; kimin hangi kartı taşıdığı gizlidir.
            </p>
          </div>
          <div className="player-cards-sheet__legend" aria-label="Takımlar">
            <span className="player-cards-sheet__legend-item player-cards-sheet__legend-item--demokrat">
              Demokrat
            </span>
            <span className="player-cards-sheet__legend-item player-cards-sheet__legend-item--otokrat">
              Otokrat
            </span>
            <span className="player-cards-sheet__legend-item player-cards-sheet__legend-item--tarafsiz">
              Tarafsız
            </span>
          </div>
        </header>

        <div className="player-cards-grid">
          {PLAYER_CARDS.map((card) => (
            <figure
              key={card.id}
              className={`player-card player-card--${card.team}`}
            >
              <div className="player-card__frame">
                <img
                  src={card.image}
                  alt={`${card.teamLabel} ${card.name} oyuncu kartı`}
                  width={324}
                  height={454}
                  loading="eager"
                  decoding="async"
                  draggable={false}
                />
              </div>
              <figcaption>
                <span className="player-card__team">{card.teamLabel}</span>
                <strong>{card.name}</strong>
                <span className="player-card__note">{card.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <footer className="player-cards-sheet__footer">
          <p className="player-cards-sheet__note">
            Kartlar oyun boyunca üst çubuktaki “Kartlar” düğmesinden yeniden
            açılabilir.
          </p>
          <Button
            variant="gold"
            size="lg"
            onClick={onClose}
            iconRight={<ArrowRight size={17} />}
          >
            Kartları Gördüm
          </Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
