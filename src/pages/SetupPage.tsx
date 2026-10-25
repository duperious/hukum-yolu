import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Database,
  Github,
  Key,
  Lock,
  Server,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/ui/CodeBlock';
import { Logo } from '../components/ui/Logo';
import { SectionHeading } from '../components/ui/SectionHeading';

const MIGRATION_COMMAND = `npx supabase link --project-ref PROJE_REF
npx supabase db push

# Edge Function için motor dosyalarını eşitle
npm run sync:engine

# Servis rolü anahtarı yalnızca Edge Function ortamında kalır
npx supabase functions deploy game`;

const ENV_EXAMPLE = `# .env — yalnızca istemciye açık değerler
VITE_SUPABASE_URL=https://PROJE.supabase.co
VITE_SUPABASE_ANON_KEY=ANON_KEY

# Service role anahtarını ASLA buraya koymayın.
# Supabase Edge Function ortamı SUPABASE_SERVICE_ROLE_KEY'i kendisi sağlar.`;

const PAGES_COMMAND = `git init
git add .
git commit -m "Hüküm Yolu"
git branch -M main
git remote add origin https://github.com/duperious/hukum-yolu.git
git push -u origin main`;

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
          <p className="eyebrow">Kurulum</p>
          <h1>Hüküm Yolu’nu yayına al</h1>
          <p>
            Bu sayfa, projeyi kendi bilgisayarında çalıştırmak, Supabase ile çok
            oyunculu modu açmak ve GitHub Pages’e yayınlamak için adım adım
            yönergeler içerir. Yerel test modu Supabase olmadan da çalışır.
          </p>
          <div className="docs-hero__chips">
            <span className="chip">
              <CheckCircle2 size={13} /> Yerel test: kurulum gerekmez
            </span>
            <span className="chip">
              <Server size={13} /> Çok oyunculu: Supabase gerekir
            </span>
            <span className="chip">
              <Github size={13} /> Yayın: GitHub Pages
            </span>
          </div>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="01"
            title="Projeyi çalıştır"
            description="Node.js 20 veya üzeri gerekir. Terminalde proje klasörüne gir ve bağımlılıkları kur."
          />
          <CodeBlock
            label="Terminal"
            code={`npm install\nnpm run dev`}
          />
          <div className="docs-note">
            <CheckCircle2 size={18} />
            <p>
              Tarayıcıda <strong>http://localhost:5173</strong> adresini aç.
              Ana sayfadaki <strong>Yerel Test Oyunu</strong> ile botlara karşı
              hemen oynayabilirsin. Bu mod için Supabase gerekmez.
            </p>
          </div>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="02"
            title="Supabase projesi oluştur"
            description="Çok oyunculu odalar, gizli roller ve sunucu doğrulaması Supabase üzerinde çalışır."
          />
          <ol className="docs-steps">
            <li>
              <span>1</span>
              <div>
                <strong>supabase.com</strong> üzerinden yeni bir proje oluştur.
                Bölge olarak sana yakın bir bölge seç.
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                Proje ayarlarından <strong>Project URL</strong> ve{' '}
                <strong>anon public key</strong> değerlerini al.
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                Proje kökünde <code>.env.example</code> dosyasını{' '}
                <code>.env</code> olarak kopyala ve değerleri doldur.
              </div>
            </li>
          </ol>
          <CodeBlock label=".env" language="dotenv" code={ENV_EXAMPLE} />
          <div className="docs-warning">
            <Lock size={18} />
            <p>
              <strong>Service role anahtarını frontend’e koyma.</strong> Bu anahtar
              RLS’yi atlar. Yalnızca Supabase Edge Function ortamında bulunur.
              İstemciye yalnızca anon key gider.
            </p>
          </div>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="03"
            title="Veritabanını ve güvenlik kurallarını kur"
            description="Migration; odalar, oyuncular, oyun durumu ve Realtime tablolarını oluşturur. RLS varsayılan olarak hassas tabloları kapatır."
          />
          <p>
            Supabase CLI ile:
          </p>
          <CodeBlock label="Supabase CLI" code={MIGRATION_COMMAND} />
          <p>
            CLI kullanmak istemiyorsan Supabase panelindeki{' '}
            <strong>SQL Editor</strong> içine{' '}
            <code>supabase/migrations/0001_hukum_yolu.sql</code> dosyasının
            tamamını yapıştırıp çalıştırabilirsin. Edge Function’ı yine de CLI ile
            deploy etmen gerekir.
          </p>
          <div className="docs-note">
            <Database size={18} />
            <p>
              <strong>room_versions</strong> tablosu yalnızca sürüm numarası,
              durum ve zaman damgası içerir; Realtime aboneliği için herkese
              okunabilir. Roller, desteler, oylar ve oyuncu sırları{' '}
              <strong>room_state</strong> / <strong>room_players</strong>{' '}
              tablolarındadır ve anon erişimine kapalıdır.
            </p>
          </div>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="04"
            title="Edge Function’ı deploy et"
            description="Oyun motoru Edge Function içinde çalışır. İstemci yalnızca redakte edilmiş görünümü alır."
          />
          <p>
            Oyun motorunu Edge Function klasörüne eşitlemek için:
          </p>
          <CodeBlock label="Terminal" code={`npm run sync:engine\nnpx supabase functions deploy game`} />
          <p>
            Motoru değiştirdiğinde <code>npm run sync:engine</code> komutunu tekrar
            çalıştır ve fonksiyonu yeniden deploy et. <code>src/game</code> tek
            kaynaktır; kopya dosyaları elle düzenleme.
          </p>
          <div className="docs-note">
            <ShieldCheck size={18} />
            <p>
              Edge Function her istekte oyuncu kimliğini ve yüksek entropili
              oyuncu sırrını doğrular. Rol dağıtımı, oy sayımı, yetki kontrolü ve
              kazanma koşulları sunucuda çalışır. İstemciden gelen “ben şu rolüm”
              gibi bir veri kabul edilmez.
            </p>
          </div>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="05"
            title="GitHub Pages’e yayınla"
            description="Depoyu GitHub’a gönder; Actions workflow’u testleri çalıştırıp dist klasörünü Pages’e yükler."
          />
          <CodeBlock label="Terminal" code={PAGES_COMMAND} />
          <ol className="docs-steps">
            <li>
              <span>1</span>
              <div>
                GitHub deposunda <strong>Settings → Pages</strong> bölümüne git.
                <strong> Source</strong> olarak <strong>GitHub Actions</strong> seç.
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Settings → Secrets and variables → Actions → Variables</strong>{' '}
                bölümüne <code>VITE_SUPABASE_URL</code> ve{' '}
                <code>VITE_SUPABASE_ANON_KEY</code> ekle.
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <code>main</code> dalına push yap. Workflow tamamlandığında site{' '}
                <code>https://duperious.github.io/hukum-yolu/</code> adresinde
                yayınlanır.
              </div>
            </li>
          </ol>
          <div className="docs-note">
            <Github size={18} />
            <p>
              Proje <strong>HashRouter</strong> ve <code>base: './'</code> kullanır.
              Böylece alt dizinde yayınlansa bile sayfa yenilemeleri 404 vermez.
              PWA manifestindeki <code>start_url</code> ve <code>scope</code>{' '}
              değerleri göreli tutulmuştur.
            </p>
          </div>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="06"
            title="Test ve derleme"
            description="Kod değişikliğinden sonra testleri ve üretim derlemesini çalıştır."
          />
          <CodeBlock
            label="Terminal"
            code={`npm test\nnpm run typecheck\nnpm run build\nnpm run preview`}
          />
          <p>
            Testler oyun kurallarını, rol dağılımını, oy ağırlıklarını, üç ret
            kuralını, geçişleri, kazanma koşullarını, tasfiyeyi, redaksiyonu ve
            botları kapsar. Arayüz testleri bu sürümde yoktur; canlı Supabase
            entegrasyonu bu geliştirme ortamında uçtan uca doğrulanamamıştır.
          </p>
        </section>

        <section className="docs-section">
          <SectionHeading
            eyebrow="07"
            title="Bilinen sınırlamalar"
            description="Dürüst olalım: bu bir üretim sertleştirmesi değil, çalışan bir oyun uygulamasıdır."
          />
          <ul className="docs-limitations">
            <li>
              <AlertTriangle size={16} />
              Canlı Supabase bağlantısı ve Edge Function deploy’u bu ortamda
              uçtan uca test edilmedi. Yerel test modu ve motor testleri çalışıyor.
            </li>
            <li>
              <AlertTriangle size={16} />
              Oda işlemlerinde iyimser sürüm kontrolü vardır. Oyuncu/bot ekleme
              ve oyun durumu yazımı atomiktir; hazır durumu, profil güncelleme ve
              oyuncu çıkarma gibi bazı lobi değişiklikleri ayrı işlemlerdir. Yoğun
              eşzamanlı tıklamalarda istemci yenileme isteyebilir.
            </li>
            <li>
              <AlertTriangle size={16} />
              Rate limiting, moderasyon, sohbet ve sesli iletişim yoktur.
            </li>
            <li>
              <AlertTriangle size={16} />
              Oyuncu kimliği bu cihazdaki localStorage sırrına bağlıdır. Tarayıcı
              verisi silinirse aynı oyuncu kimliğiyle dönüş garanti değildir.
            </li>
            <li>
              <AlertTriangle size={16} />
              Oyun sırasında bağlantısı kopan (sekmesini kapatan) insan oyuncunun
              yerini bot almaz; sıra onda kalırsa oyun bekleyebilir. “Ayrıl” ile
              ayrılan oyuncunun rolü ise bot tarafından devralınır.
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
