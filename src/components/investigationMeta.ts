import demokratCard from '../assets/investigation/demokrat.jpg';
import otokratCard from '../assets/investigation/otokrat.jpg';
import type { InvestigationResult } from '../game';

export interface InvestigationCardMeta {
  label: 'Demokrat' | 'Otokrat';
  image: string;
  alt: string;
  tone: 'blue' | 'red';
  note: string;
}

/**
 * Soruşturma sonucu oyun içinde "iyi/kötü" olarak değil, oyuncuya gösterilen
 * iki karttan biriyle anlatılır. Otokrat Lider ve Nötr de Demokrat kartı verir.
 */
export const INVESTIGATION_CARD: Record<InvestigationResult, InvestigationCardMeta> = {
  iyi: {
    label: 'Demokrat',
    image: demokratCard,
    alt: 'Demokrat soruşturma kartı',
    tone: 'blue',
    note: 'Soruşturma bu oyuncunun Demokrat kartını gösterdi.',
  },
  kotu: {
    label: 'Otokrat',
    image: otokratCard,
    alt: 'Otokrat soruşturma kartı',
    tone: 'red',
    note: 'Soruşturma bu oyuncunun Otokrat kartını gösterdi.',
  },
};
