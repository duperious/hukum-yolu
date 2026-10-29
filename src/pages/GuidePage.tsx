import {
  ArrowLeft,
  BookOpen,
  Crown,
  Eye,
  Landmark,
  LockKeyhole,
  Scale,
  ShieldAlert,
  Skull,
  Sparkles,
  Sun,
  Swords,
  Users,
  Vote,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PolicyTrack } from '../components/PolicyTrack';
import { INVESTIGATION_CARD } from '../components/investigationMeta';
import { RoleComposition } from '../components/RoleComposition';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Logo } from '../components/ui/Logo';
import {
  DEMOCRATIC_TRACK_LABELS,
  FASCIST_TRACK_LABELS,
  GAME_CONFIG,
  ROLE_INFO,
  ROLE_ORDER,
  RULE_ASSUMPTIONS,
  getRoleCounts,
} from '../game';
import type { Role } from '../game';

const ROLE_ICONS: Record<Role, ReactNode> = {
  otokrat_lider: <Crown size={20} />,
  otokrat: <Swords size={20} />,
  buyuk_vezir: <Landmark size={20} />,
  notr: <Scale size={20} />,
  istihbarat_baskani: <Eye size={20} />,
  sade_demokrat: <Sun size={20} />,
};

const PHASES: Array<{ title: string; text: string }> = [
  {
    title: 'Rol dağıtımı',
    text: 'Her oyuncu rolünü gizli olarak görür ve onaylar. Otokratlar birbirini tanır; Lider 7-10 oyunculu masalarda sıradan Otokratlara görünmez.',
  },
  {
    title: 'Başkan ve Başbakan adaylığı',
    text: 'Başkan sırayla belirlenir. Başkan, kendisi ve önceki Başbakan dışından bir Başbakan adayı gösterir. Uygun aday kalmazsa kısıt gevşer.',
  },
  {
    title: 'Hükümet oylaması',
    text: 'Oyunda olan tüm oyuncular kabul veya ret oyu verir. İlk üç reform tamamlanana kadar oylar gizlidir; yalnızca hükümetin kabul/ret sonucu açıklanır. Büyük Vezir’in oyu bu dönemde iki sayılır. İlk üç reform tamamlandığında, dönem sayısından bağımsız olarak oylama açık yapılır; bireysel oylar ve blok hedefi sonuçla birlikte görünür. Açık oylamada bir oyuncunun oy ağırlığı, rolü açıklanmadıkça gösterilmez.',
  },
  {
    title: 'Oylama sonucu',
    text: 'Gizli oylamada yalnızca hükümetin kabul/ret sonucu açıklanır; sayılar ve bireysel oylar saklı kalır. Açık oylamada Evet/Hayır toplamı ve bireysel tercihler de görünür. Hükümet kabul edilirse yasama başlar; reddedilirse ret sayacı artar ve yeni döneme geçilir.',
  },
  {
    title: 'Reform seçimi',
    text: 'Hükümet kurulursa Başkan 3 karttan 1’ini eler, Başbakan kalan 2 karttan 1’ini seçip ilerleme kâğıdının üzerine koyar. Reform önce duyurulur, ardından özel yetkiler çözülür. Deste azalınca yeniden karıştırılır.',
  },
  {
    title: 'Dönem kapanışı',
    text: 'Reform ve özel yetkiler çözüldükten sonra dönem tutanağı açılır. Dönemi Başkan kapatır; kapatmazsa host 45 saniye sonra ilerletir.',
  },
  {
    title: 'Bağlantı kopması',
    text: 'Bağlantı koparsa koltuğun 60 saniye bekletilir. Süre dolarsa bot devralır; oyuncu dönerse botun oynadığı koltuğu geri alabilir. Bilerek “Ayrıl” diyen oyuncunun token’ı silinir ve koltuğu geri alınamaz.',
  },
  {
    title: 'Özel yetkiler',
    text: 'Reform çizelgesindeki eşikler üçüncü reform yetkisi, tutuklama ve liderlik kontrolü gibi güçleri açar. Soruşturma ise İstihbarat Başkanı’nda 2. dönemden itibaren iki dönemde bir yenilenir ve hak olan dönemde zorunludur.',
  },
  {
    title: 'Oyun sonu',
    text: 'Bir taraf kazanana kadar dönemler sürer. Oyun bitince tüm roller, desteler ve oylar açıklanır.',
  },
];

const WIN_CONDITIONS: Array<{ title: string; text: string; tone: string }> = [
  {
    title: 'Demokratik zafer',
    text: `${GAME_CONFIG.democraticWinThreshold} Demokratik Reform yürürlüğe girerse Demokratlar kazanır.`,
    tone: 'blue',
  },
  {
    title: 'Otokrat zaferi',
    text: `${GAME_CONFIG.fascistTrackLength} Otokrat Reform yürürlüğe girerse Otokratlar kazanır.`,
    tone: 'red',
  },
  {
    title: 'Liderlik kontrolü',
    text: `${GAME_CONFIG.powers.leaderChancellorAtFascist}. Otokrat Reform’dan sonra Otokrat Lider Başbakan seçilirse Otokratlar kazanır.`,
    tone: 'red',
  },
  {
    title: 'Tutuklama',
    text: 'Otokrat Lider tutuklanır ve kırmızı Nötr liderliği devralmazsa Demokratlar kazanır.',
    tone: 'gold',
  },
  {
    title: 'Nötr',
    text: 'Nötr üçüncü reformda tarafını seçer. Kırmızı Nötr liderliği devralıp tasfiyeyi tamamlarsa kişisel zafer kazanır.',
    tone: 'violet',
  },
  {
    title: 'Tasfiye',
    text: 'Tasfiye yalnızca kırmızı Nötr liderliği devraldıktan sonra geçerli kişisel zaferdir. Demokratik veya Otokrat zaferiyle birlikte değerlendirilir.',
    tone: 'violet',
  },
];

export default function GuidePage() {
  return (
    <div className="guide-page">
      <header className="site-nav">
        <Logo />
        <nav className="site-nav__links">
          <Link to="/" className="nav-link">
            <ArrowLeft size={15} />
            Ana Sayfa
          </Link>
        </nav>
      </header>

      <main className="guide-main">
        <section className="guide-hero">
          <p className="eyebrow">Kural rehberi</p>
          <h1>Hüküm Yolu nasıl oynanır?</h1>
          <p>
            Hüküm Yolu; gizli roller, ilk üç reforma kadar gizli kalan oylamalar
            ve reform çizelgeleri üzerine kurulu bir sosyal çıkarım oyunudur.
            Demokratlar ülkeyi korumaya, Otokratlar ise reformları kendi
            lehlerine çevirmeye çalışır. Ortada bir de kendi çıkarını kovalayan
            Nötr vardır.
          </p>
          <div className="guide-hero__meta">
            <span className="chip">
              <Users size={13} /> {GAME_CONFIG.minPlayers}-{GAME_CONFIG.maxPlayers} oyuncu
            </span>
            <span className="chip">
              <Vote size={13} /> Gizli oylar
            </span>
            <span className="chip">
              <ShieldAlert size={13} /> Gizli roller
            </span>
          </div>
          <div className="guide-hero__actions">
            <Link to="/" className="btn btn--gold btn--md">
              <span className="btn__icon" aria-hidden="true">
                <Users size={17} />
              </span>
              <span className="btn__label">Oda Kur</span>
            </Link>
          </div>
        </section>

        <section className="guide-section" id="roller">
          <SectionHeading
            eyebrow="Roller"
            title="Masada kim var?"
            description="Her rolün takımı, yetenekleri ve soruşturma sonucu farklıdır. Aşağıdaki kartlar oyun içindeki gizli rol kartlarının herkese açık özetidir."
          />
          <div className="role-guide-grid">
            {ROLE_ORDER.map((role) => {
              const info = ROLE_INFO[role];
              return (
                <article
                  key={role}
                  className={`role-guide-card role-guide-card--${info.accent}`}
                >
                  <header className="role-guide-card__header">
                    <span className="role-guide-card__icon" aria-hidden="true">
                      {ROLE_ICONS[role]}
                    </span>
                    <div>
                      <h3>{info.name}</h3>
                      <span className="role-guide-card__team">{info.teamLabel}</span>
                    </div>
                  </header>
                  <p className="role-guide-card__description">{info.description}</p>
                  <p className="role-guide-card__mission">
                    <strong>Görev:</strong> {info.mission}
                  </p>
                  <div className="role-guide-card__section">
                    <strong>Yetenekler</strong>
                    <ul>
                      {info.abilities.map((ability) => (
                        <li key={ability}>{ability}</li>
                      ))}
                    </ul>
                  </div>
                  <footer className="role-guide-card__meta">
                    <span className={`badge badge--${info.investigation === 'kotu' ? 'red' : 'blue'}`}>
                      Soruşturma: {INVESTIGATION_CARD[info.investigation].label}
                    </span>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>

        <section className="guide-section" id="dagilim">
          <SectionHeading
            eyebrow="Dağılım"
            title="Rol dağılımı"
            description="Oyuncu sayısına göre sabit dağılım aşağıdadır. Botlar eksik oyuncuları doldurur; çok oyunculu odada insanlar ve eklenen botlar birlikte sayılır."
          />
          <div className="table-scroll">
            <table className="rules-table">
              <thead>
                <tr>
                  <th scope="col">Oyuncu</th>
                  {ROLE_ORDER.map((role) => (
                    <th scope="col" key={role}>
                      {ROLE_INFO[role].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(
                  { length: GAME_CONFIG.maxPlayers - GAME_CONFIG.minPlayers + 1 },
                  (_, index) => GAME_CONFIG.minPlayers + index,
                ).map((total) => {
                  const counts = getRoleCounts(total);
                  return (
                    <tr key={total}>
                      <th scope="row">{total}</th>
                      {ROLE_ORDER.map((role) => (
                        <td key={role}>{counts[role]}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="guide-composition">
            <div>
              <strong>5 oyuncu örneği</strong>
              <RoleComposition totalPlayers={5} />
            </div>
            <div>
              <strong>10 oyuncu örneği</strong>
              <RoleComposition totalPlayers={10} />
            </div>
          </div>
        </section>

        <section className="guide-section" id="akis">
          <SectionHeading
            eyebrow="Dönem akışı"
            title="Bir dönem nasıl geçer?"
            description="Oyun, rollerin onaylanmasıyla başlar ve bir taraf kazanana kadar aynı döngüyü izler."
          />
          <ol className="phase-list">
            {PHASES.map((phase, index) => (
              <li key={phase.title} className="phase-list__item">
                <span className="phase-list__number">{index + 1}</span>
                <div>
                  <h3>{phase.title}</h3>
                  <p>{phase.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="guide-note">
            <Vote size={18} />
            <p>
              Üst üste <strong>{GAME_CONFIG.failedGovernmentLimit} ret</strong> olursa
              hükümet kurulmadan destenin üstündeki kart yürürlüğe girer. Bu otomatik
              kart, üçüncü reform özel yetkisini <strong>kazandırmaz</strong>.
            </p>
          </div>
        </section>

        <section className="guide-section" id="reformlar">
          <SectionHeading
            eyebrow="Reformlar"
            title="İki çizelge, tek kader"
            description="Demokratik ve Otokrat reformlar ayrı çizelgelerde birikir. Çizelgelerdeki eşikler özel yetkileri açar."
          />
          <div className="guide-tracks">
            <PolicyTrack
              type="demokratik"
              enacted={0}
              length={GAME_CONFIG.democraticWinThreshold}
              labels={DEMOCRATIC_TRACK_LABELS}
            />
            <PolicyTrack
              type="otokrat"
              enacted={0}
              length={GAME_CONFIG.fascistTrackLength}
              labels={FASCIST_TRACK_LABELS}
            />
          </div>
        </section>

        <section className="guide-section" id="yetkiler">
          <SectionHeading
            eyebrow="Özel yetkiler"
            title="Reformların açtığı kapılar"
            description="Bazı yetkiler otomatik, bazıları yalnızca hükümet eliyle yürürlüğe giren reformlarla kazanılır."
          />
          <div className="power-guide-grid">
            <article className="power-guide-card">
              <span className="power-guide-card__icon">
                <Eye size={20} />
              </span>
              <h3>Soruşturma</h3>
              <p>
                İstihbarat Başkanı, {GAME_CONFIG.powers.investigationStartRound}. dönemden
                itibaren iki dönemde bir (2, 4, 6…) bir oyuncunun kartını
                soruşturmak zorundadır. Hakkın olmadığı dönemlerde bu adım
                atlanır. Soruşturma tamamlanmadan oy, adaylık veya reform adımına
                geçilemez.
                Sonuç yalnızca ona gösterilir. Sıradan Otokrat “Otokrat”, diğer
                roller “Demokrat” kartı verir; Otokrat Lider ve Nötr de Demokrat
                görünür.
              </p>
            </article>
            <article className="power-guide-card">
              <span className="power-guide-card__icon">
                <Sparkles size={20} />
              </span>
              <h3>Üçüncü reform yetkisi</h3>
              <p>
                {GAME_CONFIG.powers.thirdReformAtFascist}. Otokrat Reform’dan sonra
                deste incelenir veya bir oyuncunun oyu engellenir. 5-6 oyunculu
                masalarda inceleme, daha kalabalık masalarda oy engelleme kullanılır.
              </p>
            </article>
            <article className="power-guide-card">
              <span className="power-guide-card__icon">
                <Crown size={20} />
              </span>
              <h3>Liderlik kontrolü</h3>
              <p>
                {GAME_CONFIG.powers.leaderChancellorAtFascist}. Otokrat Reform’dan
                sonra Otokrat Lider Başbakan seçilirse Otokratlar anında kazanır.
              </p>
            </article>
            <article className="power-guide-card">
              <span className="power-guide-card__icon">
                <LockKeyhole size={20} />
              </span>
              <h3>Tutuklama</h3>
              <p>
                {GAME_CONFIG.powers.assassinationAtFascist.join(' ve ')}. Otokrat
                Reform’lardan sonra Başkan bir oyuncuyu tutuklatır. Otokrat Lider
                tutuklanırsa Demokratlar kazanır.
              </p>
            </article>
            <article className="power-guide-card">
              <span className="power-guide-card__icon">
                <Landmark size={20} />
              </span>
              <h3>Büyük Vezir</h3>
              <p>
                Büyük Vezir’in oyu iki sayılır. İlk üç reformdan sonra tarafı
                belirlenir; kimliği geçiş veya idamla açıklanabilir. Demokrat Parti
                Başkanı makamına geçebilir.
              </p>
            </article>
            <article className="power-guide-card">
              <span className="power-guide-card__icon">
                <Skull size={20} />
              </span>
              <h3>Tasfiye</h3>
              <p>
                Kırmızı Nötr liderliği devraldığında tasfiye hedeflerini kullanabilir.
                Tasfiye zaferi yalnızca bu senaryoda geçerli kişisel zaferdir.
              </p>
            </article>
          </div>
        </section>

        <section className="guide-section" id="zafer">
          <SectionHeading
            eyebrow="Kazanma"
            title="Oyun nasıl biter?"
            description="Oyun; reform çizelgesi, tutuklama, liderlik kontrolü veya tasfiye ile sonuçlanabilir. Oyun dışı kalan oyuncular da takımlarıyla kazanabilir."
          />
          <div className="win-grid">
            {WIN_CONDITIONS.map((condition) => (
              <article
                key={condition.title}
                className={`win-card win-card--${condition.tone}`}
              >
                <h3>{condition.title}</h3>
                <p>{condition.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="guide-section" id="varsayimlar">
          <SectionHeading
            eyebrow="Kural varsayımları"
            title="Metinde açık olmayan noktalar"
            description="Aşağıdaki varsayımlar motorun ve arayüzün tutarlı çalışması için benimsenmiştir. Kuralları değiştirmek istersen önce src/game/config.ts dosyasını düzenle."
          />
          <ul className="assumption-list">
            {RULE_ASSUMPTIONS.map((assumption, index) => (
              <li key={assumption}>
                <span className="assumption-list__number">{index + 1}</span>
                <span>{assumption}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="guide-cta">
          <div>
            <p className="eyebrow">Masa hazır</p>
            <h2>Şimdi sıra sende.</h2>
            <p>
              Arkadaşlarınla çok oyunculu bir oda kur.
            </p>
          </div>
          <div className="guide-cta__actions">
            <Link to="/" className="btn btn--gold btn--md">
              <span className="btn__icon" aria-hidden="true">
                <Users size={16} />
              </span>
              <span className="btn__label">Oda Kur</span>
            </Link>
          </div>
        </section>

        <footer className="guide-footer">
          <BookOpen size={16} />
          <span>
            Hüküm Yolu: Kurallar ve varsayımlar bu sayfada özetlenmiştir.
          </span>
        </footer>
      </main>
    </div>
  );
}
