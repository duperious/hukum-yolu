/**
 * Hüküm Yolu — çekirdek oyun tipleri.
 *
 * Bu dosya tarayıcıda ve testlerde çalışacak şekilde bağımsız tutulur. UI bileşenleri bu tipleri doğrudan kullanmaz;
 * kullanıcıya gösterilen veri `redact.ts` içindeki görünümlerden gelir.
 */

export type Role =
  | 'otokrat_lider'
  | 'otokrat'
  | 'buyuk_vezir'
  | 'notr'
  | 'istihbarat_baskani'
  | 'sade_demokrat';

export type Team = 'demokrat' | 'otokrat' | 'monarsi';

export type PolicyCard = 'demokratik' | 'otokrat';

export type NotrSide = 'mavi' | 'kirmizi';

export type Winner = 'demokrat' | 'otokrat' | 'notr';

export type InvestigationResult = 'iyi' | 'kotu';

export type GameMode = 'local' | 'multiplayer';

export type BigVezirOutcome = 'demokrat' | 'idam' | 'yok';

export type VoteResult = 'kabul' | 'ret';

export type Phase =
  | 'roleReveal'
  | 'nomination'
  | 'voting'
  | 'voteResult'
  | 'presidentDiscard'
  | 'chancellorEnact'
  | 'policyReveal'
  | 'notrChoice'
  | 'peek'
  | 'assassination'
  | 'termEnd'
  | 'gameOver';

export interface VoteEntry {
  playerId: string;
  choice: boolean;
  weight: number;
}

export interface VoteTally {
  yes: number;
  no: number;
  blockedPlayerId: string | null;
  entries: VoteEntry[];
}

export interface PendingPolicy {
  card: PolicyCard;
  presidentId: string;
  chancellorId: string;
  auto: boolean;
}

export interface TermSummary {
  round: number;
  presidentId: string;
  chancellorId: string | null;
  voteResult: VoteResult | null;
  tally: VoteTally | null;
  openVoting: boolean;
  policy: PolicyCard | null;
  policyAuto: boolean;
  failedVotes: number;
  outcome: 'legislative' | 'rejected' | 'autoPolicy';
  nextPresidentId: string | null;
  notes: string[];
  endedAt: number;
}

export type LogKind =
  | 'system'
  | 'government'
  | 'vote'
  | 'policy'
  | 'power'
  | 'death'
  | 'transition'
  | 'bot'
  | 'win';

export interface Player {
  id: string;
  name: string;
  avatarId: string;
  isBot: boolean;
  isHost: boolean;
  role: Role;
  alive: boolean;
  /** Oy hakkı ağırlığı. Büyük Vezir 2 ile başlar. */
  votePower: number;
  /** Rolün oyun sonundaki/geçiş sonrası tarafı. */
  effectiveTeam: Team;
  joinedAt: number;
}

export interface LogEntry {
  id: string;
  round: number;
  at: number;
  kind: LogKind;
  text: string;
}

export interface GovernmentRecord {
  round: number;
  presidentId: string;
  chancellorId: string;
  policy: PolicyCard;
  auto: boolean;
}

export interface LegislativeState {
  presidentId: string;
  chancellorId: string;
  /** Yalnızca Başkan tarafından görülür. */
  presidentCards: PolicyCard[];
  /** Yalnızca Başbakan tarafından görülür. */
  chancellorCards: PolicyCard[] | null;
  /** Yalnızca Başkan tarafından görülür. */
  presidentDiscard: PolicyCard | null;
}

export interface PendingBlock {
  playerId: string;
  usableRound: number;
  used: boolean;
}

export interface PendingPeek {
  presidentId: string;
  cards: PolicyCard[];
}

export interface PendingAssassination {
  presidentId: string;
  reformNumber: number;
}

export interface GameState {
  id: string;
  mode: GameMode;
  phase: Phase;
  players: Player[];
  playerOrder: string[];
  round: number;
  presidentId: string | null;
  chancellorId: string | null;
  previousChancellorId: string | null;
  votes: Record<string, boolean>;
  blockedVotePlayerId: string | null;
  failedVotes: number;
  deck: PolicyCard[];
  discardPile: PolicyCard[];
  enacted: { democratic: number; fascist: number };
  policyHistory: PolicyCard[];
  governmentHistory: GovernmentRecord[];
  log: LogEntry[];

  // Gizli roller / taraf bilgileri
  leaderId: string;
  leadershipTransferred: boolean;
  notrSide: NotrSide | null;
  notrChoicePending: boolean;
  democraticPartyPresidentId: string | null;
  intelligenceOfficeHolderId: string | null;
  firstThreeResolved: boolean;
  bigVezirOutcome: BigVezirOutcome | null;
  publiclyRevealedRoles: Record<string, Role>;

  // Bekleyen özel yetkiler
  pendingPeek: PendingPeek | null;
  pendingAssassination: PendingAssassination | null;
  pendingBlock: PendingBlock | null;
  legislative: LegislativeState | null;

  // Soruşturma
  investigations: Record<string, Record<string, InvestigationResult>>;
  investigatedThisRound: Record<string, string[]>;

  // Rol açılışı
  roleRevealAcknowledged: string[];

  // Oyun sonu
  winner: Winner | null;
  winReason: string | null;
  winnerIds: string[];
  revealedRoles: Record<string, Role> | null;

  // Meta
  startPresidentId: string;
  lastVoteResult: VoteResult | null;
  lastVoteTally: VoteTally | null;
  lastVoteOpen: boolean;
  lastGovernment: { presidentId: string; chancellorId: string } | null;
  pendingPolicy: PendingPolicy | null;
  lastEnactedPolicy: PolicyCard | null;
  lastPolicyAuto: boolean;
  termSummary: TermSummary | null;
  /** Geçiş kapısının otomatik kapanacağı zaman (host saati). */
  gateEndAt: number | null;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface StartGamePlayer {
  id: string;
  name: string;
  avatarId: string;
  isBot: boolean;
  isHost: boolean;
  joinedAt: number;
}

export interface StartGameInput {
  players: StartGamePlayer[];
  mode: GameMode;
  id?: string;
  rng?: Rng;
  now?: number;
}

export type Rng = () => number;

export type GameAction =
  | { type: 'ack_role' }
  | { type: 'nominate'; targetId: string }
  | { type: 'vote'; choice: boolean }
  | { type: 'continue' }
  | { type: 'end_term' }
  | { type: 'president_discard'; card: PolicyCard }
  | { type: 'chancellor_enact'; card: PolicyCard }
  | { type: 'investigate'; targetId: string }
  | { type: 'use_block'; targetId: string }
  | { type: 'skip_block' }
  | { type: 'choose_notr_side'; side: NotrSide }
  | { type: 'assassinate'; targetId: string }
  | { type: 'ack_peek' };

/** UI'ın gördüğü, güvenli biçimde filtrelenmiş oyuncu. */
export interface PublicPlayer {
  id: string;
  name: string;
  avatarId: string;
  isBot: boolean;
  isHost: boolean;
  alive: boolean;
  joinedAt: number;
  isPresident: boolean;
  isChancellor: boolean;
  /** Yalnızca kurallar gereği açıklanmış roller (ör. idam edilen Büyük Vezir). */
  revealedRole?: Role;
}

export interface PublicGameState {
  id: string;
  mode: GameMode;
  phase: Phase;
  round: number;
  players: PublicPlayer[];
  presidentId: string | null;
  chancellorId: string | null;
  previousChancellorId: string | null;
  failedVotes: number;
  enacted: { democratic: number; fascist: number };
  deckCount: number;
  discardCount: number;
  policyHistory: PolicyCard[];
  governmentHistory: GovernmentRecord[];
  log: LogEntry[];
  lastVoteResult: VoteResult | null;
  lastVoteTally: VoteTally | null;
  lastVoteOpen: boolean;
  /** Açık oylamada bireysel tercihler; gizli oylamada boş nesne. */
  revealedVotes: Record<string, boolean>;
  openVoting: boolean;
  lastGovernment: { presidentId: string; chancellorId: string } | null;
  lastEnactedPolicy: PolicyCard | null;
  lastPolicyAuto: boolean;
  termSummary: TermSummary | null;
  /** Geçiş kapısının otomatik kapanacağı zaman (host saati). */
  gateEndAt: number | null;
  votesSubmitted: number;
  /** Oyunu oylayan oyuncular. Oy tercihleri asla bu listeden çıkarılamaz. */
  votedPlayerIds: string[];
  totalVoters: number;
  notrChoicePending: boolean;
  notrChoiceResolved: boolean;
  firstThreeResolved: boolean;
  bigVezirOutcome: BigVezirOutcome | null;
  publiclyRevealedRoles: Record<string, Role>;
  democraticPartyPresidentId: string | null;
  roleComposition: Record<Role, number>;
  winner: Winner | null;
  winReason: string | null;
  winnerIds: string[];
  revealedRoles: Record<string, Role> | null;
  pendingEffect: 'notrChoice' | 'peek' | 'assassination' | null;
  totalPlayers: number;
  livingPlayers: number;
  democraticWinThreshold: number;
  fascistTrackLength: number;
  createdAt: number;
  updatedAt: number;
}

export interface KnownPlayer {
  id: string;
  name: string;
  role: Role;
}

export interface PrivateView {
  playerId: string;
  role: Role;
  effectiveTeam: Team;
  votePower: number;
  isAlive: boolean;
  isPresident: boolean;
  isChancellor: boolean;
  isLeader: boolean;
  isNotr: boolean;
  notrSide: NotrSide | null;
  knownPlayers: KnownPlayer[];
  investigations: Record<string, InvestigationResult>;
  canInvestigate: boolean;
  investigateTargets: string[];
  investigationUsedThisRound: boolean;
  canBlock: boolean;
  blockTargetId: string | null;
  youWereBlocked: boolean;
  hasVoted: boolean;
  yourVote: boolean | null;
  roleRevealAcknowledged: boolean;
  pendingPeekCards: PolicyCard[] | null;
  legislativeCards: PolicyCard[] | null;
  legislativeRole: 'president' | 'chancellor' | null;
  canNominate: boolean;
  eligibleChancellorIds: string[];
  canVote: boolean;
  canContinue: boolean;
  canEndTerm: boolean;
  canDiscard: boolean;
  canEnact: boolean;
  canAssassinate: boolean;
  assassinationTargets: string[];
  canChooseNotrSide: boolean;
  isHost: boolean;
  isBot: boolean;
}

export interface RedactedGameState {
  public: PublicGameState;
  private: PrivateView;
}

export interface RoleInfo {
  id: Role;
  name: string;
  team: Team;
  teamLabel: string;
  shortDescription: string;
  /** Oyuncunun kendi ekranında öne çıkan kısa zafer görevi. */
  mission: string;
  description: string;
  abilities: string[];
  investigation: InvestigationResult;
  accent: 'blue' | 'red' | 'gold' | 'violet';
  icon: 'crown' | 'swords' | 'landmark' | 'scale' | 'eye' | 'sun';
}

export interface RoleCounts {
  otokrat_lider: number;
  otokrat: number;
  buyuk_vezir: number;
  notr: number;
  istihbarat_baskani: number;
  sade_demokrat: number;
}

export type PurgeScenario =
  | 'vezir_hayatta_mavi'
  | 'vezir_hayatta_kirmizi'
  | 'vezir_olu_mavi'
  | 'vezir_olu_kirmizi';

export interface GameConfig {
  minPlayers: number;
  maxPlayers: number;
  democraticWinThreshold: number;
  fascistTrackLength: number;
  deck: { democratic: number; fascist: number };
  drawCount: number;
  passCount: number;
  failedGovernmentLimit: number;
  powers: {
    investigationAtFascist: number;
    thirdReformAtFascist: number;
    thirdReformPeekMaxPlayers: number;
    assassinationAtFascist: readonly number[];
    leaderChancellorAtFascist: number;
  };
  roleDistribution: Record<number, RoleCounts>;
  investigationResults: Record<Role, InvestigationResult>;
  purgeTargets: Record<PurgeScenario, Role[]>;
}
