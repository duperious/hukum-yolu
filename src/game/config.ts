import type {
  GameConfig,
  InvestigationResult,
  Role,
  RoleCounts,
  PurgeScenario,
} from './types';

/**
 * TEK KAYNAK: Oyunun tüm sayısal eşikleri burada tutulur.
 *
 * Demokratik zafer eşiğini değiştirmek için yalnızca
 * `democraticWinThreshold` değerini güncellemek yeterlidir.
 * UI, testler ve oyun motoru bu dosyayı okur.
 */
export const GAME_CONFIG: GameConfig = {
  minPlayers: 5,
  maxPlayers: 10,
  democraticWinThreshold: 6,
  fascistTrackLength: 7,
  deck: { democratic: 8, fascist: 12 },
  drawCount: 3,
  passCount: 2,
  failedGovernmentLimit: 3,
  powers: {
    investigationAtFascist: 2,
    thirdReformAtFascist: 3,
    thirdReformPeekMaxPlayers: 6,
    assassinationAtFascist: [5, 6],
    leaderChancellorAtFascist: 4,
  },
  roleDistribution: {
    5: { otokrat_lider: 1, otokrat: 1, buyuk_vezir: 1, notr: 1, istihbarat_baskani: 1, sade_demokrat: 0 },
    6: { otokrat_lider: 1, otokrat: 1, buyuk_vezir: 1, notr: 1, istihbarat_baskani: 1, sade_demokrat: 1 },
    7: { otokrat_lider: 1, otokrat: 2, buyuk_vezir: 1, notr: 1, istihbarat_baskani: 1, sade_demokrat: 1 },
    8: { otokrat_lider: 1, otokrat: 2, buyuk_vezir: 1, notr: 1, istihbarat_baskani: 1, sade_demokrat: 2 },
    9: { otokrat_lider: 1, otokrat: 3, buyuk_vezir: 1, notr: 1, istihbarat_baskani: 1, sade_demokrat: 2 },
    10: { otokrat_lider: 1, otokrat: 3, buyuk_vezir: 1, notr: 1, istihbarat_baskani: 1, sade_demokrat: 3 },
  },
  /**
   * Kural metninde Büyük Vezir ve İstihbarat Başkanı için sonuç açıkça
   * yazmıyor. Metindeki tek "Kötü" sonucu sıradan Otokrat olduğu için
   * diğer tüm roller "İyi" kabul edilir. README'de varsayım olarak belirtilir.
   */
  investigationResults: {
    otokrat_lider: 'iyi',
    otokrat: 'kotu',
    buyuk_vezir: 'iyi',
    notr: 'iyi',
    istihbarat_baskani: 'iyi',
    sade_demokrat: 'iyi',
  },
  /**
   * Tasfiye hedefleri tablosu. Hedefler ROL KARTLARINA göre çözülür.
   * Metindeki "Demokrat Parti Başkanı ve halefi" ifadesiyle tam örtüşmediği
   * README'de açıkça belirtilir. Tablo, uygulanabilir kural olarak kabul edilir.
   */
  purgeTargets: {
    vezir_hayatta_mavi: ['buyuk_vezir', 'notr'],
    vezir_hayatta_kirmizi: ['buyuk_vezir', 'istihbarat_baskani'],
    vezir_olu_mavi: ['notr', 'istihbarat_baskani'],
    vezir_olu_kirmizi: ['istihbarat_baskani'],
  } satisfies Record<PurgeScenario, Role[]>,
};

/** Kullanıcının istediği tek satırlık eşik sabiti. */
export const DEMOCRATIC_WIN_THRESHOLD = GAME_CONFIG.democraticWinThreshold;

/** Otokrat reform çizelgesindeki özel yetkilerin kısa adları. */
export const FASCIST_TRACK_LABELS: string[] = [
  'Özel yetki yok',
  'Soruşturma',
  'Oyuncu sayısına göre yetki',
  'Lider Başbakan olursa zafer',
  'Suikast',
  'Suikast',
  'Otokrat zaferi',
];

export const DEMOCRATIC_TRACK_LABELS: string[] = Array.from(
  { length: GAME_CONFIG.democraticWinThreshold },
  (_, i) => `${i + 1}. Demokratik Reform`,
);

export const ROLE_ORDER: Role[] = [
  'otokrat_lider',
  'otokrat',
  'buyuk_vezir',
  'notr',
  'istihbarat_baskani',
  'sade_demokrat',
];

export const RULE_ASSUMPTIONS: string[] = [
  'Başkan kendisini Başbakan adayı gösteremez. Başka uygun aday kalmadığında bu kısıt gevşetilir.',
  'Önceki dönemin Başbakanı bir sonraki dönemde aday gösterilemez. Başka uygun aday kalmadığında bu kısıt gevşetilir.',
  'Soruşturma sonucu yalnızca sıradan Otokrat için "Kötü"; diğer tüm roller için "İyi" kabul edilir. Büyük Vezir ve İstihbarat Başkanı da "İyi" döner.',
  'Tasfiye hedefleri tablodaki rol kartlarına göre çözülür. Tablo ile "Demokrat Parti Başkanı ve halefi" açıklaması arasındaki fark README\'de belirtilmiştir.',
  'Tasfiye zaferi yalnızca kırmızı Nötr liderliği devraldıktan sonra geçerli kişisel zaferdir.',
  'Kırmızı Nötr, İstihbarat Başkanlığı görevini yalnızca Büyük Vezir ölmüşse devralır. Bu devir gizli tutulur.',
  'Büyük Vezir ilk üç reform tamamlandığında ölmüşse, çoğunluk sonucuna göre varsayımsal taraf atanır; kimliği açıklanmaz.',
  'Demokrat Parti Başkanı ölürse halef sırası: hayattaki Nötr → İstihbarat Başkanı rolü sahibi → boş.',
  'Üçüncü Otokrat Reform\'un kart inceleme/oy engelleme yetkisi yalnızca hükümet eliyle yürürlüğe girerse kazanılır; üç ret sonrası otomatik yürürlüğe giren kart özel yetki kazandırmaz.',
  'Oy engelleme yetkisi sonraki hükümet oylamasında, sonuç açıklanmadan önce kullanılabilir; hedef kendisi olamaz. Kullanılmazsa sonuçla birlikte sona erer.',
  'Büyük Vezir ilk üç reformdan sonra Demokratik tarafa geçip oy gücü 2’den 1’e düşerse oylama açık yapılır; bireysel oylar sonuçla birlikte açıklanır. Oy gücü 0’a düşerse oylama gizli kalır.',
  'Nötr, üçüncü reform tamamlandığında (otomatik yürürlüğe girse bile) tarafını seçer. Seçim yalnızca Nötr ve oyun motoru tarafından bilinir.',
  'Büyük Vezir\'in kimliği ilk üç reform geçişinde (demokratik tarafa geçiş veya idam) açıklanır. Önceden ölmüşse açıklanmaz.',
  'Demokrat Parti Başkanı makamı herkese açıktır. Bu makam Nötr\'e geçerse Nötr\'ün rolü duyulur; seçtiği taraf duyurulmaz.',
  'İstihbarat Başkanlığı makamı ve soruşturma sonuçları gizlidir. Ölen yetkilinin eski sonuçları yeni yetkiliye geçmez.',
  'Ölen oyuncular rolleriyle birlikte kazanabilir; oy kullanamaz, aday olamaz ve eylem yapamaz.',
  'Botlar yalnızca herkese açık bilgileri ve kendi gizli bilgilerini kullanır. Gizli bilgileri oyun günlüğüne yazmaz.',
  'Başlangıç Başkanı canlı oyuncular arasından rastgele seçilir; sonrasında sıra canlı oyuncular arasında ilerler.',
  'Üçüncü Otokrat Reform\'un 5-6 oyunculu inceleme yetkisi, destenin üstündeki üç kartı aynı sırayla geri koyar.',
  '5-6 oyunculu oyunlarda Otokratlar birbirini ve Lider\'i tanır. 7-10 oyunculu oyunlarda sıradan Otokratlar birbirini tanır, Lider\'i tanımaz; Lider tüm Otokratları tanır.',
];

export const ROLE_COUNTS_BY_PLAYER_COUNT: Record<number, RoleCounts> =
  GAME_CONFIG.roleDistribution;

export function getRoleCounts(totalPlayers: number): RoleCounts {
  const counts = GAME_CONFIG.roleDistribution[totalPlayers];
  if (!counts) {
    throw new Error(`Desteklenmeyen oyuncu sayısı: ${totalPlayers}`);
  }
  return { ...counts };
}

export function getInvestigationResult(role: Role): InvestigationResult {
  return GAME_CONFIG.investigationResults[role];
}
