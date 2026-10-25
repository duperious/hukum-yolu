import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Github,
  Globe2,
  Key,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Terminal,
  Users,
  Wifi,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/ui/CodeBlock';
import { Logo } from '../components/ui/Logo';
import { SectionHeading } from '../components/ui/SectionHeading';

const PAGES_COMMAND = `git add .
git commit -m "Hüküm Yolu"
git push origin main`;

const DEV_COMMAND = `npm install
npm run dev`;

const TEST_COMMAND = `npm test
npm run typecheck
npm run build
npm run preview`;

export default function SetupPage() {
  return (
    <div className="docs-page">
      <header className="site-nav">
        <Logo />
        <nav className="site-nav__links">
          <Link to="/guide" className="nav-link">
            <BookOpen size={15} />
            Nasıl Oynanır?
          </Link>
          <Link to="/" className="nav-link">
            <ArrowLeft size={15} />
            Ana Sayfa
          </Link>
        </nav>
      </header>

      <main className="docs-main">
        <section className="docs-hero">
          <p className="eyebrow">Online rehber</p>
          <h1>Sunucusuz oda, doğrudan bağlantı</h1>
          <p>
            Hüküm Yolu’nun online modu Supabase veya ayrı bir sunucu gerektirmez.
            Oda sahibinin tarayıcısı oyunu yönetir; oyuncular WebRTC üzerinden
            doğrudan birbirine bağlanır. GitHub Pages’e yüklediğinizde ek bir
            ortam değişkeni veya backend kurulumu gerekmez.
          </p>
          <div className="docs-hero__chips">
            <span className="chip">
              <CheckCircle2 size={13} /> Kurulum gerekmez
            </span>
            <span className="chip">
              <Wifi size={13} /> WebRTC + PeerJS
            </span>
            <span className="chip">
              <Github size={13} /> GitHub Pages
            </span>
          </div>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="01"
            title="Nasıl çalışır?"
            description="Oda sahibi yetkili tarayıcıdır. Diğer oyuncular yalnızca kendi güvenli görünümlerini alır."
          />
          <ol className="docs-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Oda oluşturulur.</strong> Oda sahibi “Oyun Oluştur” der.
                Altı karakterlik bir oda kodu üretilir ve oda durumu oda sahibinin
                tarayıcısında tutulur.
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Oyuncular eşleşir.</strong> Kod veya davet bağlantısı
                paylaşılır. PeerJS’in genel sinyal sunucusu ve STUN/TURN
                sunucuları üzerinden WebRTC bağlantısı kurulur.
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Herkes kendi ekranını görür.</strong> Roller, desteler,
                oylar ve özel yetkiler oda sahibinde kalır. Her istemciye yalnızca
                görmesi gereken filtrelenmiş görünüm gönderilir.
              </div>
            </li>
            <li>
              <span>4</span>
              <div>
                <strong>Oda sahibi sekmesi açık kalmalı.</strong> Oda sahibi
                sekmeyi kapatırsa yeni katılım ve oyun akışı durur. Sekme
                yenilenirse oda durumu aynı tarayıcıda geri yüklenir.
              </div>
            </li>
          </ol>
          <div className="docs-note">
            <ShieldCheck size={18} />
            <p>
              Bu model <strong>host-authoritative</strong> çalışır: kuralları oda
              sahibinin tarayıcısı uygular. Sunucu tarafından doğrulanan bir oyun
              değildir; oda sahibi teknik olarak tüm rolleri görebilir.
            </p>
          </div>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="02"
            title="Oda kur ve arkadaşlarını çağır"
            description="Online oyun için hesap, e-posta veya veritabanı gerekmez."
          />
          <ol className="docs-steps">
            <li>
              <span>1</span>
              <div>
                Ana sayfada <strong>Oyun Oluştur</strong> seçin. Profilinizi
                girdikten sonra oda lobisi açılır.
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                Oda kodunu veya <strong>Davet linki</strong>ni paylaşın.
                Arkadaşlarınız ana sayfada <strong>Odaya Katıl</strong> ile kodu
                girebilir.
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                En az 5, en fazla 10 oyuncu gerekir. Eksik oyuncuları{' '}
                <strong>Bot ekle</strong> ile tamamlayabilirsiniz. Tüm insan
                oyuncular <strong>Hazırım</strong> dediğinde oda sahibi oyunu
                başlatır.
              </div>
            </li>
            <li>
              <span>4</span>
              <div>
                Oylamada büyük <strong>Evet</strong> ve <strong>Hayır</strong>{' '}
                kartlarından birini seçip oyunuzu gönderin. Oylar gizlidir;
                yalnızca sonuç açıklanır.
              </div>
            </li>
          </ol>
          <div className="docs-note">
            <Users size={18} />
            <p>
              Aynı tarayıcıda iki sekme açacaksanız her sekme kendi oturumunu
              kullanır. Oda sahibi sekmesini kapatmadan diğer sekmede odaya
              katılabilirsiniz; bu yalnızca yerel test için önerilir.
            </p>
          </div>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="03"
            title="Bağlantı koparsa ne olur?"
            description="Kısa kopmalar tolere edilir; uzun kopmalarda oyun devam eder."
          />
          <ul className="docs-limitations">
            <li>
              <RefreshCw size={16} />
              Bağlantısı kopan insan oyuncu için 45 saniyelik bir bekleme süresi
              vardır. Bu süre içinde geri dönerse aynı oyuncu olarak devam eder.
            </li>
            <li>
              <Smartphone size={16} />
              Süre dolarsa lobideyse odadan çıkarılır; oyun sırasındaysa rolü bot
              tarafından devralınır. Aynı oyuncu oyun sırasında yeni kimlikle
              yeniden katılamaz.
            </li>
            <li>
              <Key size={16} />
              İstemci yeniden bağlanma anahtarı bu cihazda saklanır. Oda sahibi
              sekmesini yenilerse oda durumu aynı tarayıcıdan geri yüklenir.
            </li>
            <li>
              <Globe2 size={16} />
              Bazı kurumsal ağlar ve VPN’ler WebRTC’yi engelleyebilir. STUN/TURN
              sunucuları çoğu ev ağında yeterlidir; katı ağlarda bağlantı
              kurulamayabilir.
            </li>
          </ul>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="04"
            title="GitHub Pages’e yayınla"
            description="Depo zaten GitHub Actions ile test edip yayınlayacak şekilde hazır."
          />
          <CodeBlock label="Terminal" code={PAGES_COMMAND} />
          <ol className="docs-steps">
            <li>
              <span>1</span>
              <div>
                GitHub deposunda <strong>Settings → Pages</strong> bölümüne gidin
                ve <strong>Source: GitHub Actions</strong> seçin.
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <code>main</code> dalına push yapın. Workflow testleri çalıştırır,
                üretim derlemesini alır ve <code>dist/</code> klasörünü Pages’e
                yükler.
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                Site <code>https://KULLANICI.github.io/hukum-yolu/</code>{' '}
                adresinde yayınlanır. Supabase anahtarı veya ek secret gerekmez.
              </div>
            </li>
          </ol>
          <div className="docs-note">
            <Github size={18} />
            <p>
              Proje <strong>HashRouter</strong> ve <code>base: './'</code> kullanır.
              Böylece alt dizinde yayınlansa bile oda bağlantıları ve sayfa
              yenilemeleri 404 vermez.
            </p>
          </div>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="05"
            title="Yerel geliştirme ve test"
            description="Kod değişikliğinden sonra testleri ve üretim derlemesini çalıştırın."
          />
          <CodeBlock label="Terminal" code={DEV_COMMAND} />
          <CodeBlock label="Terminal" code={TEST_COMMAND} />
          <p>
            Testler oyun kurallarını, rol dağılımını, oy ağırlıklarını, üç ret
            kuralını, geçişleri, kazanma koşullarını, tasfiyeyi, redaksiyonu,
            botları ve oda sahibi yetkili oda akışını kapsar.
          </p>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="06"
            title="Dürüst sınırlamalar"
            description="Bu bir üretim sertleştirmesi değil, çalışan bir sosyal oyun uygulamasıdır."
          />
          <ul className="docs-limitations">
            <li>
              <AlertTriangle size={16} />
              Oda sahibinin sekmesi açık kalmalıdır. Sekme kapanırsa oda kapanır;
              oyuncular yeniden bağlanamaz.
            </li>
            <li>
              <AlertTriangle size={16} />
              Roller sunucuda değil, oda sahibinin tarayıcısında tutulur. Oda
              sahibi tarayıcı geliştirici araçlarıyla tüm rolleri görebilir. Bu
              yüzden arkadaşlar arasında oynarken güvenilir bir oda sahibi seçin.
            </li>
            <li>
              <AlertTriangle size={16} />
              WebRTC bağlantısı ağ koşullarına bağlıdır. Simetrik NAT, güvenlik
              duvarı veya VPN bağlantıyı engelleyebilir; bu durumda farklı bir ağ
              deneyin.
            </li>
            <li>
              <AlertTriangle size={16} />
              Sohbet, sesli iletişim, moderasyon, hesap sistemi ve kalıcı oda
              geçmişi yoktur.
            </li>
            <li>
              <AlertTriangle size={16} />
              Oda sahibi tarayıcısı arka planda uzun süre kalırsa mobil işletim
              sistemleri sekmeyi askıya alabilir. Oyun sırasında oda sahibi
              sekmesini ön planda tutmak en güvenlisidir.
            </li>
          </ul>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="07"
            title="Sorun giderme"
            description="En sık görülen üç durum ve hızlı çözümleri."
          />
          <ul className="docs-limitations">
            <li>
              <Wifi size={16} />
              <strong>“Oda bulunamadı”</strong> — Kodu kontrol edin ve oda
              sahibinin sekmesinin açık olduğundan emin olun. Oda sahibi sekmeyi
              yenilediyse birkaç saniye bekleyip tekrar deneyin.
            </li>
            <li>
              <RefreshCw size={16} />
              <strong>“Odaya bağlanılıyor”</strong> — Ağ bağlantısını kontrol edin.
              Birkaç saniye sonra otomatik yeniden deneme başlar; yine olmazsa
              sayfayı yenileyin.
            </li>
            <li>
              <Terminal size={16} />
              <strong>Oda sahibi oyunu kaybetti</strong> — Oda sahibi aynı
              tarayıcıda <code>#/room/KOD</code> adresine dönerse oda durumu
              depodan geri yüklenir. Tarayıcı verisi silindiyse oda kurtarılamaz.
            </li>
          </ul>
        </section>

        <section className="docs-cta">
          <div>
            <p className="eyebrow">Hazır mısın?</p>
            <h2>Kuralları oku, masayı kur.</h2>
            <p>
              Rol dağılımı, reform çizelgeleri, özel yetkiler ve kural
              varsayımları rehberde.
            </p>
          </div>
          <div className="docs-cta__actions">
            <Link to="/guide" className="btn btn--gold btn--md">
              <span className="btn__icon" aria-hidden="true">
                <BookOpen size={17} />
              </span>
              <span className="btn__label">Nasıl Oynanır?</span>
            </Link>
            <Link to="/local" className="btn btn--outline btn--md">
              <span className="btn__icon" aria-hidden="true">
                <Terminal size={17} />
              </span>
              <span className="btn__label">Yerel Test</span>
            </Link>
            <Link to="/" className="btn btn--ghost btn--md">
              <span className="btn__icon" aria-hidden="true">
                <Key size={17} />
              </span>
              <span className="btn__label">Ana Sayfa</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
