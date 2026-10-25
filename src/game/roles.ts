import type { Role, RoleInfo } from './types';

export const ROLE_INFO: Record<Role, RoleInfo> = {
  otokrat_lider: {
    id: 'otokrat_lider',
    name: 'Otokrat Lider',
    team: 'otokrat',
    teamLabel: 'Otokrat Takımı',
    shortDescription: 'Kırmızı takımın gizli lideri.',
    mission:
      'Otokrat Reformları 7\'ye ulaştır. 4. Otokrat Reform\'dan sonra Başbakan seçilirsen de kazanırsın.',
    description:
      'Otokrat takımının gizli liderisin. Takım arkadaşlarını tanırsın. 7 Otokrat Reform yürürlüğe girerse veya 4. Otokrat Reform’dan sonra Başbakan seçilirsen Otokratlar kazanır. Suikastla öldürülürsen ve kırmızı Nötr liderliği devralmazsa Demokratlar kazanır.',
    abilities: [
      'Tüm Otokratları tanırsın.',
      '4. Otokrat Reform’dan sonra Başbakan seçilirsen Otokratlar kazanır.',
      '7. Otokrat Reform Otokrat zaferini getirir.',
      'Öldürülürsen kimliğin oyun bitene kadar açıklanmaz.',
    ],
    investigation: 'iyi',
    accent: 'red',
    icon: 'crown',
  },
  otokrat: {
    id: 'otokrat',
    name: 'Otokrat',
    team: 'otokrat',
    teamLabel: 'Otokrat Takımı',
    shortDescription: 'Otokrat takımının sıradan üyesi.',
    mission:
      'Otokrat Reformları destekle. 7. reformda veya Lider\'in zaferinde kazanırsın.',
    description:
      'Otokrat takımının bir üyesisin. 5-6 oyunculu oyunlarda Lider’i ve diğer Otokratları tanırsın. 7-10 oyunculu oyunlarda diğer Otokratları tanırsın ama Lider’in kim olduğunu bilmezsin. Otokrat zaferi için çalışırsın.',
    abilities: [
      '5-6 oyunculu oyunlarda Lider’i tanırsın.',
      '7-10 oyunculu oyunlarda yalnızca diğer Otokratları tanırsın.',
      'Soruşturmada “Kötü” sonucu verirsin.',
      '7 Otokrat Reform veya Lider’in zaferiyle kazanırsın.',
    ],
    investigation: 'kotu',
    accent: 'red',
    icon: 'swords',
  },
  buyuk_vezir: {
    id: 'buyuk_vezir',
    name: 'Büyük Vezir',
    team: 'monarsi',
    teamLabel: 'Monarşi Görevlisi',
    shortDescription: 'İki oy gücüne sahip saray görevlisi.',
    mission:
      'İlk üç reformun sonucunu bekle. Demokratlar öndeyse onlara katıl; Otokratlar öndeyse idamdan kurtul.',
    description:
      'Başlangıçta 2 oy gücüne sahipsin. İlk üç reform sonunda Demokratlar öndeyse Demokratik tarafa geçer, Demokrat Parti Başkanı olur ve oy gücün 1’e düşer. Otokratlar öndeyse idam edilirsin. Bir oylamada engellenirsen oy gücün kalıcı olarak 0’a düşer.',
    abilities: [
      'Başlangıçta 2 oy gücün vardır.',
      'İlk üç reformda Demokratlar öndeyse Demokratik tarafa geçersin.',
      'Otokratlar öndeyse idam edilir ve rolün açıklanırsın.',
      'Engellenirsen oy gücün kalıcı olarak 0 olur.',
    ],
    investigation: 'iyi',
    accent: 'gold',
    icon: 'landmark',
  },
  notr: {
    id: 'notr',
    name: 'Nötr',
    team: 'monarsi',
    teamLabel: 'Tarafsız',
    shortDescription: 'İlk üç reformdan sonra tarafını seçen gizemli figür.',
    mission:
      'İlk üç reformdan sonra gizlice mavi veya kırmızı tarafı seç ve seçtiğin tarafın zaferini sağla.',
    description:
      'İlk üç reform sonunda gizlice mavi veya kırmızı tarafı seçersin. Mavi seçersen Demokratlarla kazanırsın. Kırmızı seçersen Otokratları desteklersin; ancak normal Otokrat zaferinde otomatik kazanmazsın. Otokrat Lider ölürse ve kırmızı tarafı seçtiysen liderliği gizlice devralabilirsin. Liderliği devralırsan kişisel zafer koşulların devreye girer.',
    abilities: [
      'İlk üç reform sonunda gizlice taraf seçersin.',
      'Mavi taraf: Demokratlarla kazanırsın.',
      'Kırmızı taraf: Otokratları desteklersin, kişisel zafer peşindesin.',
      'Liderlik devri olursa 7 Otokrat Reform, Başbakan seçilme veya tasfiye ile tek başına kazanabilirsin.',
    ],
    investigation: 'iyi',
    accent: 'violet',
    icon: 'scale',
  },
  istihbarat_baskani: {
    id: 'istihbarat_baskani',
    name: 'İstihbarat Başkanı',
    team: 'demokrat',
    teamLabel: 'Demokrat Takımı',
    shortDescription: 'Gizli soruşturma yetkisine sahip Demokrat.',
    mission:
      'Soruşturma yetkini kullanarak Otokratları bul. Demokratik Reformları 6\'ya ulaştır.',
    description:
      'Demokrat takımındasın. 2. Otokrat Reform’dan sonra her tur bir oyuncuyu soruşturabilirsin. Sonuç yalnızca sana gösterilir. Ölürsen soruşturma yetkisi Demokrat Parti Başkanı’na geçer. Demokratik Reformlar 6’ya ulaşırsa veya Otokrat Lider öldürülürse kazanırsın.',
    abilities: [
      '2. Otokrat Reform’dan sonra her tur bir oyuncuyu soruşturabilirsin.',
      'Soruşturma sonucunu yalnızca sen görürsün.',
      'Ölürsen yetkin Demokrat Parti Başkanı’na geçer.',
      'Demokratik zaferde kazanırsın.',
    ],
    investigation: 'iyi',
    accent: 'blue',
    icon: 'eye',
  },
  sade_demokrat: {
    id: 'sade_demokrat',
    name: 'Sade Demokrat',
    team: 'demokrat',
    teamLabel: 'Demokrat Takımı',
    shortDescription: 'Demokratik cephenin sıradan üyesi.',
    mission:
      'Demokratik Reformları 6\'ya ulaştır veya Otokrat Lider\'i idam ettir.',
    description:
      'Demokrat takımındasın. Özel bir gizli bilgin yoktur; oylar, hükümetler ve reformlar üzerinden çıkarım yaparsın. Demokratik Reformlar 6’ya ulaşırsa veya Otokrat Lider öldürülürse kazanırsın.',
    abilities: [
      'Demokratik Reformları 6’ya ulaştır.',
      'Otokrat Lider’in öldürülmesini sağla.',
      'Gizli rol bilgin yoktur; sosyal çıkarım yaparsın.',
      'Demokratik zaferde kazanırsın.',
    ],
    investigation: 'iyi',
    accent: 'blue',
    icon: 'sun',
  },
};

export const ROLE_NAMES: Record<Role, string> = {
  otokrat_lider: 'Otokrat Lider',
  otokrat: 'Otokrat',
  buyuk_vezir: 'Büyük Vezir',
  notr: 'Nötr',
  istihbarat_baskani: 'İstihbarat Başkanı',
  sade_demokrat: 'Sade Demokrat',
};

export function isFascistRole(role: Role): boolean {
  return role === 'otokrat_lider' || role === 'otokrat';
}

export function isDemocratRole(role: Role): boolean {
  return role === 'istihbarat_baskani' || role === 'sade_demokrat';
}

export function baseTeamForRole(role: Role): 'demokrat' | 'otokrat' | 'monarsi' {
  if (isFascistRole(role)) return 'otokrat';
  if (isDemocratRole(role)) return 'demokrat';
  return 'monarsi';
}
