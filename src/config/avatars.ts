import {
  Anchor,
  BookOpen,
  Compass,
  Crown,
  Eye,
  Feather,
  Flame,
  Gem,
  Globe2,
  Key,
  Landmark,
  Moon,
  Scale,
  Shield,
  Sun,
  Swords,
  type LucideIcon,
} from 'lucide-react';

export interface AvatarDef {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Kart/daire arka planı için CSS gradyanı. */
  gradient: string;
  /** İkonun öne çıkan rengi. */
  tint: string;
}

/**
 * 16 profil avatarı. Kimlikler sunucuda yalnızca biçim olarak doğrulanır;
 * ikon eşlemesi tamamen istemci tarafındadır.
 */
export const AVATARS: AvatarDef[] = [
  {
    id: 'avatar-1',
    label: 'Taç',
    icon: Crown,
    gradient: 'linear-gradient(135deg, #6b4d1f 0%, #c9a25b 55%, #f3e0b0 100%)',
    tint: '#1b1306',
  },
  {
    id: 'avatar-2',
    label: 'Kılıç',
    icon: Swords,
    gradient: 'linear-gradient(135deg, #4a151b 0%, #9e2f3c 60%, #e07a86 100%)',
    tint: '#fff2f3',
  },
  {
    id: 'avatar-3',
    label: 'Mabet',
    icon: Landmark,
    gradient: 'linear-gradient(135deg, #14243d 0%, #2d5b8c 60%, #7bb6e8 100%)',
    tint: '#eaf5ff',
  },
  {
    id: 'avatar-4',
    label: 'Terazi',
    icon: Scale,
    gradient: 'linear-gradient(135deg, #0e2c2c 0%, #1d6b68 60%, #7fd6cf 100%)',
    tint: '#ecfffd',
  },
  {
    id: 'avatar-5',
    label: 'Gözcü',
    icon: Eye,
    gradient: 'linear-gradient(135deg, #2a173f 0%, #5c3a86 60%, #b598e3 100%)',
    tint: '#f7f0ff',
  },
  {
    id: 'avatar-6',
    label: 'Güneş',
    icon: Sun,
    gradient: 'linear-gradient(135deg, #4a2b08 0%, #b06c16 60%, #f5c35b 100%)',
    tint: '#2a1702',
  },
  {
    id: 'avatar-7',
    label: 'Hilal',
    icon: Moon,
    gradient: 'linear-gradient(135deg, #171a3a 0%, #333c78 60%, #8e9bdb 100%)',
    tint: '#f1f3ff',
  },
  {
    id: 'avatar-8',
    label: 'Kalkan',
    icon: Shield,
    gradient: 'linear-gradient(135deg, #1b2530 0%, #3f5568 60%, #93aec4 100%)',
    tint: '#f3f8fc',
  },
  {
    id: 'avatar-9',
    label: 'Alev',
    icon: Flame,
    gradient: 'linear-gradient(135deg, #471405 0%, #a83a12 60%, #f08b4a 100%)',
    tint: '#fff5ee',
  },
  {
    id: 'avatar-10',
    label: 'Çapa',
    icon: Anchor,
    gradient: 'linear-gradient(135deg, #0b2b3a 0%, #17617a 60%, #6cc3d9 100%)',
    tint: '#ecfbff',
  },
  {
    id: 'avatar-11',
    label: 'Pusula',
    icon: Compass,
    gradient: 'linear-gradient(135deg, #0e2b1e 0%, #216b45 60%, #7fd6a1 100%)',
    tint: '#effff5',
  },
  {
    id: 'avatar-12',
    label: 'Tüy',
    icon: Feather,
    gradient: 'linear-gradient(135deg, #3b1828 0%, #7d3152 60%, #d98cae 100%)',
    tint: '#fff2f8',
  },
  {
    id: 'avatar-13',
    label: 'Mücevher',
    icon: Gem,
    gradient: 'linear-gradient(135deg, #24123d 0%, #4d2a7a 60%, #a87fe0 100%)',
    tint: '#faf5ff',
  },
  {
    id: 'avatar-14',
    label: 'Anahtar',
    icon: Key,
    gradient: 'linear-gradient(135deg, #3c2c0b 0%, #8a6a1e 60%, #e5c56b 100%)',
    tint: '#231a04',
  },
  {
    id: 'avatar-15',
    label: 'Kitap',
    icon: BookOpen,
    gradient: 'linear-gradient(135deg, #2b1b12 0%, #63402a 60%, #c08b62 100%)',
    tint: '#fff7f1',
  },
  {
    id: 'avatar-16',
    label: 'Küre',
    icon: Globe2,
    gradient: 'linear-gradient(135deg, #10233f 0%, #2f5f96 60%, #8fc4f5 100%)',
    tint: '#f2f9ff',
  },
];

const AVATAR_BY_ID = new Map(AVATARS.map((avatar) => [avatar.id, avatar]));

export function getAvatar(id: string | null | undefined): AvatarDef {
  return AVATAR_BY_ID.get(id ?? '') ?? AVATARS[0];
}

export function randomAvatarId(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
}

export function isValidAvatarId(id: string): boolean {
  return AVATAR_BY_ID.has(id);
}
