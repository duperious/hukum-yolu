# Hüküm Yolu

Gizli rollü, sosyal çıkarım masa oyununun Türkçe, mobil öncelikli PWA uygulaması.

**Hüküm Yolu**, 5–10 oyuncunun iki gizli takıma ayrıldığı; Başkan, Başbakan, reform destesi, gizli oylama, soruşturma, idam ve tasfiye mekaniklerini bir araya getiren bir oyundur. Bu depo hem **tek cihazda botlara karşı yerel test modunu** hem de **Supabase üzerinden çok oyunculu oda sistemini** içerir.

> **Dürüst durum notu:** Yerel bot modu, oyun motoru testleri, tip kontrolü ve üretim derlemesi bu ortamda doğrulandı. Ancak burada bir Supabase projesi veya Docker ortamı bulunmadığı için **canlı çok oyunculu akış uçtan uca test edilmedi**. Aşağıdaki Supabase adımları çalışır bir kurulum için hazırlanmıştır; kendi projenizde iki tarayıcıyla test etmeniz gerekir. Ayrıntılar “Bilinen sınırlamalar” bölümünde.

**Canlı site:** [duperious.github.io/hukum-yolu](https://duperious.github.io/hukum-yolu/)

---

## İçindekiler

- [Özellikler](#özellikler)
- [Hızlı başlangıç](#hızlı-başlangıç)
- [Yerel test modu](#yerel-test-modu)
- [Çok oyunculu Supabase kurulumu](#çok-oyunculu-supabase-kurulumu)
- [GitHub Pages’e yayınlama](#github-pagese-yayınlama)
- [Komutlar](#komutlar)
- [Proje yapısı](#proje-yapısı)
- [Kural varsayımları ve yorumlar](#kural-varsayımları-ve-yorumlar)
- [Güvenlik modeli](#güvenlik-modeli)
- [Bilinen sınırlamalar](#bilinen-sınırlamalar)
- [Sorun giderme](#sorun-giderme)

---

## Özellikler

- **Türkçe arayüz**, koyu siyasi-gerilim teması: lacivert/kömür, demokratik mavi-turkuaz, otokratik koyu kırmızı, altın vurgular.
- **Yerel bot modu:** 1 insan + 4–9 bot. Supabase olmadan çalışır.
- **Çok oyunculu odalar:** 5–10 oyuncu, 6 karakterlik davet kodu, hazır durumu, bot ekleme/çıkarma, host devri, yeniden bağlanma.
- **16 avatar** ve cihazda saklanan profil.
- **Gizli rol dağıtımı** ve role özel bilgi ekranı.
- **Reform destesi:** 8 demokratik + 12 otokrat reform, iki ayrı çizelge.
- **Gizli oylama**, ağırlıklı Büyük Vezir oyu, 3 ret sonrası otomatik reform.
- **Soruşturma**, 3. reform özel yetkileri, suikast, liderlik devri, tasfiye.
- **Kazanma koşulları:** demokratik, otokratik ve Nötr kişisel zafer.
- **PWA:** yüklenebilir uygulama, çevrimdışı kabuk, üretilmiş ikonlar.
- **Testler:** rol dağılımı, fazlar, oylama, ağırlıklar, engelleme, otomatik reform, geçişler, Nötr, 3. reform güçleri, suikast, liderlik devri, tüm kazanma koşulları, tasfiye, redaksiyon/güvenlik ve botlar.

---

## Hızlı başlangıç

Gereksinimler:

- **Node.js 20 veya üzeri** (bu depo Node 26 ile de geliştirildi)
- npm
- İsteğe bağlı: Supabase hesabı (yalnızca çok oyunculu mod için)

```bash
git clone https://github.com/duperious/hukum-yolu.git
cd hukum-yolu
npm install
npm run dev
```

Tarayıcıda terminalin gösterdiği adresi açın (genellikle `http://localhost:5173`).

Supabase ayarlamadan da uygulama açılır. Ana sayfada **“Yerel test”** ile botlara karşı oynayabilirsiniz. Çok oyunculu düğmeleri, Supabase yapılandırılmadığında bunu dürüstçe söyler.

### Ortam değişkenleri

```bash
cp .env.example .env
```

`.env` içine kendi Supabase projenizin değerlerini yazın:

```dotenv
VITE_SUPABASE_URL=https://PROJE_REF.supabase.co
VITE_SUPABASE_ANON_KEY=ANON_VEYA_PUBLISHABLE_KEY
```

> **Service role anahtarını asla `.env` dosyasına koymayın.** Edge Function, `SUPABASE_SERVICE_ROLE_KEY` değerini Supabase ortamından otomatik alır. `VITE_` ile başlayan her değer tarayıcı paketine gömülür ve herkese açıktır.

---

## Yerel test modu

1. Ana sayfada **“Yerel test”** seçin.
2. Profilinizi ve bot sayısını (4–9) belirleyin.
3. Rol dağılımı önizlemesini kontrol edip oyunu başlatın.
4. Rolünüzü gördükten sonra “Anladım” deyin.
5. Oyun sonunda aynı kadroyla yeniden başlatabilirsiniz.

Yerel mod tamamen tarayıcıda çalışır; ağ bağlantısı veya Supabase gerekmez. Oyun durumu sekme kapanınca kaybolur.

---

## Çok oyunculu Supabase kurulumu

Aşağıdaki adımlar tek seferlik kurulum içindir. Komutları proje kökünde çalıştırın.

### 1. Supabase projesi oluşturun

1. [supabase.com](https://supabase.com) üzerinden yeni bir proje oluşturun.
2. **Project Settings → API** bölümünden şunları not edin:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** anahtarı → `VITE_SUPABASE_ANON_KEY`
3. `.env` dosyanızı bu değerlerle doldurun.

> Yeni Supabase projelerinde `sb_publishable_...` biçiminde bir anahtar da görebilirsiniz. Edge Function’ın varsayılan JWT doğrulaması eski `anon` JWT’siyle uyumludur. Publishable anahtar kullanıyorsanız aşağıdaki deploy komutuna `--no-verify-jwt` ekleyin; fonksiyon kendi oyuncu sırrı doğrulamasını zaten yapar.

### 2. Supabase CLI’yı kullanın

CLI’yı global kurmak zorunda değilsiniz; `npx` yeterlidir:

```bash
npx supabase login
npx supabase link --project-ref PROJE_REF
```

`PROJE_REF`, Supabase proje URL’sindeki `https://PROJE_REF.supabase.co` kısmıdır.

### 3. Veritabanı şemasını uygulayın

```bash
npx supabase db push
```

Bu komut `supabase/migrations/0001_hukum_yolu.sql` dosyasını uygular. Şema şunları içerir:

- `rooms`, `room_players`, `room_state` — istemciye kapalı, yalnızca Edge Function erişir.
- `room_versions` — Realtime sinyali için herkese açık, **rol/oy/sır içermeyen** küçük tablo.
- RLS politikaları, atomik oda üyesi ekleme, iyimser sürüm kontrolü ve Realtime yayını.

SQL’i alternatif olarak Supabase Dashboard → **SQL Editor** içine yapıştırıp çalıştırabilirsiniz.

### 4. Oyun motorunu Edge Function’a eşitleyin

Edge Function, `src/game` ve `src/bots` klasörlerinin dışına erişemez. Bu yüzden motorun bir kopyası üretilir:

```bash
npm run sync:engine
```

Bu komut şunları üretir:

- `supabase/functions/game/engine/*.ts`
- `supabase/functions/game/bots/index.ts`

Kopya dosyaları **elle düzenlemeyin**. Oyun motorunu değiştirdikten sonra yeniden `npm run sync:engine` çalıştırın.

### 5. Edge Function’ı deploy edin

```bash
npx supabase functions deploy game
```

Publishable anahtar kullanıyorsanız:

```bash
npx supabase functions deploy game --no-verify-jwt
```

Fonksiyon şu ortam değişkenlerini Supabase’den otomatik alır:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Bu anahtarları istemciye veya depoya **koymayın**.

### 6. İki tarayıcıyla test edin

1. `npm run dev` çalıştırın.
2. Bir tarayıcıda oda kurun.
3. Kodu veya davet bağlantısını kopyalayın.
4. Gizli pencerede/yeni tarayıcıda bağlantıyı açıp odaya katılın.
5. En az 5 oyuncu (insan + bot) olacak şekilde bot ekleyin.
6. Herkes “Hazırım” dediğinde host oyunu başlatır.

Oda kodları karıştırılabilen `I`, `O`, `0`, `1` karakterlerini içermez.

---

## GitHub Pages’e yayınlama

Depo, GitHub Actions ile otomatik dağıtım için hazırlanmıştır.

### 1. Depoyu GitHub’a gönderin

```bash
git init
git add .
git commit -m "Hüküm Yolu"
git branch -M main
git remote add origin https://github.com/duperious/hukum-yolu.git
git push -u origin main
```

### 2. Pages kaynağını ayarlayın

GitHub deposunda:

1. **Settings → Pages**
2. **Build and deployment → Source: GitHub Actions**

### 3. Supabase değişkenlerini ekleyin (isteğe bağlı)

**Settings → Secrets and variables → Actions → Variables** altında:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Bu değerler yoksa site yine yayınlanır; yalnızca yerel bot modu çalışır.

### 4. Yayınlayın

`main` dalına push ettiğinizde `.github/workflows/deploy.yml` çalışır:

1. `npm ci`
2. `npm test`
3. `npm run build`
4. `dist/` klasörünü GitHub Pages’e yükler

Uygulama **HashRouter** kullandığı için `https://duperious.github.io/hukum-yolu/#/room/ABC123` gibi bağlantılar alt dizinde sorunsuz çalışır. Vite `base: './'` olarak ayarlanmıştır.

### PWA ikonları

İkonlar `public/` altında hazırdır. Yeniden üretmek için:

```bash
npm run icons
```

Bu komut `sharp` kullanır ve `public/favicon.svg` ile 192/512/maskable/180 px ikonları üretir.

---

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Tip kontrolü + üretim derlemesi |
| `npm run preview` | Üretim derlemesini önizleme |
| `npm test` | Vitest testlerini bir kez çalıştırır |
| `npm run test:watch` | Testleri izleme modunda çalıştırır |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run sync:engine` | Motoru Edge Function klasörüne kopyalar |
| `npm run icons` | PWA ikonlarını yeniden üretir |

---

## Proje yapısı

```text
.
├── src/
│   ├── game/              # Saf TypeScript oyun motoru (tarayıcı + Deno)
│   │   ├── config.ts      # Eşikler, rol tablosu, deste, varsayımlar
│   │   ├── engine.ts      # Durum makinesi ve tüm kurallar
│   │   ├── redact.ts      # İstemciye gösterilecek güvenli görünüm
│   │   └── ...
│   ├── bots/              # Bot yapay zekâsı
│   ├── components/        # Oyun ve lobi arayüzü
│   ├── pages/             # Ana sayfa, rehber, oda, kurulum
│   ├── hooks/             # Yerel oyun ve çok oyunculu oda kancaları
│   ├── lib/               # Supabase istemcisi, oturum, doğrulama
│   ├── config/            # 16 avatar tanımı
│   └── styles/            # Tema ve responsive CSS
├── tests/                 # Motor, rol ve güvenlik testleri
├── scripts/
│   ├── sync-engine.mjs    # src/game -> Edge Function kopyası
│   └── generate-icons.mjs # PWA ikonları
├── supabase/
│   ├── config.toml
│   ├── migrations/        # Şema, RLS, SQL fonksiyonları
│   └── functions/game/    # Edge Function + üretilen motor kopyası
├── public/                # favicon ve PWA ikonları
└── .github/workflows/     # GitHub Pages dağıtımı
```

### Tek kaynak kuralı

Oyuncu sayısına göre rol dağılımı, destedeki reform sayıları, kazanma eşiği, soruşturma sonuçları ve tasfiye tablosu **`src/game/config.ts`** içinde merkezîdir. Örneğin demokratik zafer eşiği tek bir yerde tanımlıdır:

```ts
export const DEMOCRATIC_WIN_THRESHOLD = 6;
```

Arayüzdeki rehber de bu sabitleri okur; kural metni ile motorun ayrışmaması hedeflenir.

---

## Kural varsayımları ve yorumlar

Oyunun orijinal metninde açık olmayan veya birbiriyle çelişebilen noktalar için şu varsayımlar kullanıldı. Tam liste `src/game/config.ts` içindeki `RULE_ASSUMPTIONS` dizisinde ve uygulama içi **Rehber** sayfasındadır.

- **Başkan kendini aday gösteremez.** Başka uygun aday kalmadığında bu kısıt gevşetilir.
- **Önceki turun Başbakanı** bir sonraki turda aday gösterilemez; başka uygun aday yoksa kısıt gevşetilir.
- **Soruşturma** yalnızca sıradan Otokrat için “Kötü” döner. Büyük Vezir, İstihbarat Başkanı ve diğerleri “İyi” görünür.
- **Tasfiye hedefleri** tablodaki rol kartlarına göre çözülür. Tablo ile “Demokrat Parti Başkanı ve halefi” açıklaması arasındaki fark bilinçli olarak tablo lehine yorumlanmıştır; tablo korunur, fark burada belgelenir.
- **Tasfiye zaferi** yalnızca kırmızı Nötr liderliği devraldıktan sonra geçerli kişisel zaferdir.
- **Kırmızı Nötr**, İstihbarat Başkanlığı görevini yalnızca Büyük Vezir ölmüşse devralır; bu devir gizli tutulur.
- **Büyük Vezir’in kimliği** ilk üç reform geçişinde (demokratik tarafa geçiş veya idam) açıklanır. Önceden ölmüşse açıklanmaz; varsayımsal taraf çoğunluk sonucuna göre atanır.
- **3. Otokrat Reform’un kart inceleme/oy engelleme yetkisi** yalnızca hükümet eliyle yürürlüğe girerse kazanılır. Üç ret sonrası otomatik yürürlüğe giren kart özel yetki kazandırmaz.
- **Oy engelleme** sonraki hükümet oylamasında, sonuç açıklanmadan önce kullanılabilir; hedef kendisi olamaz; kullanılmazsa sonuçla birlikte sona erer. Büyük Vezir engellenirse oy gücü kalıcı olarak 0 olur; diğer oyuncular yalnızca o oyu kaybeder.
- **Nötr**, üçüncü reform tamamlandığında (otomatik yürürlüğe girse bile) tarafını seçer. Seçim yalnızca Nötr ve oyun motoru tarafından bilinir.
- **Demokrat Parti Başkanı makamı** herkese açıktır. Bu makam Nötr’e geçerse Nötr’ün rolü duyulur; seçtiği taraf duyurulmaz.
- **Ölen oyuncular** rolleriyle birlikte kazanabilir; oy kullanamaz, aday olamaz ve eylem yapamaz.
- **Başlangıç Başkanı** canlı oyuncular arasından rastgele seçilir; sonrasında sıra canlı oyuncular arasında ilerler.
- **Botlar** yalnızca herkese açık bilgileri ve kendi gizli bilgilerini kullanır; gizli bilgileri oyun günlüğüne yazmaz.

---

## Güvenlik modeli

### Supabase Auth kullanılmıyor

Oyuncu hesabı yoktur. Her oda üyeliği için sunucu şunları üretir:

- `playerId` — rastgele UUID
- `playerSecret` — 32 baytlık, 64 karakterlik yüksek entropili sır

Sır yalnızca oda kurma/katılma yanıtında **bir kez** istemciye verilir ve tarayıcıda `localStorage` içinde saklanır. Veritabanında düz metin değil, **SHA-256 özeti** tutulur. Her istekte istemci `playerId + playerSecret` gönderir; Edge Function özeti karşılaştırır.

### RLS ve service role

- `rooms`, `room_players`, `room_state`: RLS açık, istemci politikası yok → `anon`/`authenticated` için varsayılan **red**.
- Bu tablolara yalnızca **service_role** yetkili Edge Function erişir.
- `room_versions`: yalnızca `room_id`, `version`, `status`, `updated_at` içerir. Realtime aboneliği için herkese açık okunabilir; **rol, oy, deste veya oyuncu sırrı içermez**.
- Service role anahtarı yalnızca Supabase Edge Function ortamındadır; istemci paketine girmez.

### Sunucu tarafı doğrulama ve redaksiyon

- Rol dağıtımı, oy sayımı, adaylık kuralları, yetki kontrolleri, güçler ve kazanma koşulları sunucudaki motor kopyasında çalışır.
- İstemciden gelen `gameAction` yalnızca izin verilen alanlara göre ayrıştırılır; rol/oy/sonuç bilgisi kabul edilmez.
- Yanıt, `redactGameState` ile izleyiciye göre filtrelenir. Deste, gizli oylar, roller, engellenen oyuncu, Nötr tarafı, İstihbarat makamı ve bekleyen güçler istemciye gönderilmez.
- Oyun durumu yazımı iyimser sürüm kontrolüyle yapılır; aynı anda gelen iki eylemden biri `409` alır ve istemci yenilenir.

### Neler yok?

Bu bir üretim sertleştirmesi değildir. Rate limiting, moderasyon, sohbet, sesli iletişim, hesap kurtarma ve gelişmiş kötüye kullanım tespiti yoktur. Herkese açık bir oyunda bunları eklemek gerekir.

---

## Bilinen sınırlamalar

- **Canlı Supabase uçtan uca test edilmedi.** Bu ortamda Supabase projesi/Docker yoktu. Yerel mod, motor testleri, tip kontrolü ve üretim derlemesi doğrulandı. Çok oyunculu akışı kendi projenizde iki tarayıcıyla test edin.
- **Rate limiting / moderasyon / sohbet yok.**
- **Oyuncu kimliği localStorage’a bağlı.** Tarayıcı verisi silinirse aynı kimlikle dönüş garanti değildir.
- **Oyun sırasında “Ayrıl”** oyuncuyu botla değiştirir. **Sekmeyi kapatmak** bot devri yapmaz; sıra o oyuncuda kalırsa oyun bekleyebilir. Bu durumda oyuncu oturumu cihazda kaldığı için geri dönebilir.
- **Host oyun sırasında sekmesini kapatırsa** otomatik host devri yoktur; lobide “Host’luğu Devral” vardır. Açıkça “Ayrıl” diyen host’un yerine yeni host atanır.
- **Lobi değişikliklerinin bir kısmı ayrı işlemlerdir.** Oyuncu/bot ekleme ve oyun durumu yazımı atomiktir; hazır durumu, profil güncelleme ve oyuncu çıkarma ayrı UPDATE + sürüm artırma adımları kullanır. Yoğun eşzamanlı tıklamalarda istemci yenileme isteyebilir.
- **`room_versions` herkese açıktır.** İçinde sır yoktur; yalnızca oda kimliği, sürüm, durum ve zaman bulunur. Yine de kaç aktif oda olduğu gibi metabilgiler görülebilir.
- **Yeniden başlatma 5–10 oyuncu ister.** Bitmiş oyunda oyuncular ayrılıp kadro 5’in altına düşerse host yeni oda kurmalıdır.
- **PWA kurulumu** HTTPS veya `localhost` gerektirir. GitHub Pages HTTPS sağlar.

---

## Sorun giderme

### “Supabase yapılandırılmadı” uyarısı

`.env` dosyasında `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değerlerinin dolu olduğundan emin olun. Değişiklikten sonra geliştirme sunucusunu yeniden başlatın.

### Odaya katılırken 401 / “Oturum doğrulanamadı”

- Oda başlamış veya oyuncu çıkarılmış olabilir.
- Tarayıcıdaki eski oturumu temizleyin:
  ```js
  localStorage.removeItem('hukum-yolu:session:v1');
  ```
- Lobideyse davet bağlantısıyla yeniden katılın.

### Edge Function 404 / CORS hatası

- Fonksiyonun deploy edildiğinden emin olun:
  ```bash
  npx supabase functions deploy game
  ```
- `supabase/config.toml` içinde `[functions.game]` bölümü vardır.
- Tarayıcı geliştirici araçlarında `OPTIONS` isteğinin `200` döndüğünü kontrol edin. Fonksiyon CORS başlıklarını kendisi ekler.

### Realtime çalışmıyor

Uygulama her 4 saniyede bir yoklama (polling) yapar; Realtime çalışmasa da oyun ilerler. Realtime’ı kontrol etmek için:

- `supabase/migrations/0001_hukum_yolu.sql` uygulanmış olmalı.
- `room_versions` tablosu `supabase_realtime` yayınına eklenmiş olmalı.
- Tarayıcı konsolunda websocket hatalarını kontrol edin.

### “Motor eşitleme” hatası

```bash
npm run sync:engine
```

Komut `src/game/*.ts` ve `src/bots/index.ts` dosyalarını `supabase/functions/game/` altına kopyalar. Göreli importlara `.ts` uzantısı ekler. Hata alırsanız scriptin çıktısındaki dosya adına bakın.

### Edge Function logları

```bash
npx supabase functions logs game
```

### Testler başarısız

```bash
npm test
npm run typecheck
```

Testler tarayıcı gerektirmez; Vitest Node ortamında çalışır.

---

## Lisans

Bu depo kişisel/eğitim amaçlı bir projedir. Oyunun özgün tasarımı ve adı ilgili hak sahiplerine aittir. Ticari kullanım öncesi hakları kontrol edin.
