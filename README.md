# Hüküm Yolu

Gizli rollü, sosyal çıkarım masa oyununun Türkçe, mobil öncelikli PWA uygulaması.

**Hüküm Yolu**, 5–10 oyuncunun iki gizli takıma ayrıldığı; Başkan, Başbakan, reform destesi, gizli oylama, soruşturma, idam ve tasfiye mekaniklerini bir araya getiren bir oyundur. Depo, **PeerJS/WebRTC üzerinden sunucusuz çok oyunculu oda sistemini** içerir.

**Canlı site:** [duperious.github.io/hukum-yolu](https://duperious.github.io/hukum-yolu/)

> **Dürüst durum notu:** Oyun motoru testleri, oda sahibi yetkili oda akışı testleri, tip kontrolü ve üretim derlemesi doğrulandı. Online mod PeerJS/WebRTC kullanır; bu geliştirme ortamındaki tarayıcı hiçbir ICE adayı üretmediği için **iki ayrı cihaz arasındaki gerçek WebRTC bağlantısı burada uçtan uca doğrulanamadı**. Ağ üzerinden oynarken kendi cihazlarınızda test etmeniz gerekir. Ayrıntılar [Bilinen sınırlamalar](#bilinen-sınırlamalar) bölümünde.

---

## İçindekiler

- [Özellikler](#özellikler)
- [Hızlı başlangıç](#hızlı-başlangıç)
- [Online oyun nasıl çalışır?](#online-oyun-nasıl-çalışır)
- [Oda kurma ve katılma](#oda-kurma-ve-katılma)
- [Bağlantı kopmaları](#bağlantı-kopmaları)
- [GitHub Pages’e yayınlama](#github-pagese-yayınlama)
- [Komutlar](#komutlar)
- [Proje yapısı](#proje-yapısı)
- [Güvenlik modeli](#güvenlik-modeli)
- [Bilinen sınırlamalar](#bilinen-sınırlamalar)
- [Testler](#testler)
- [Sorun giderme](#sorun-giderme)

---

## Özellikler

- **Türkçe arayüz**, koyu siyasi-gerilim teması: lacivert/kömür, demokratik mavi-turkuaz, otokratik koyu kırmızı, altın vurgular.
- **Sunucusuz online odalar:** 5–10 oyuncu, 6 karakterlik davet kodu, hazır durumu, bot ekleme/çıkarma, yeniden bağlanma.
- **PeerJS/WebRTC:** Genel sinyal sunucusu ve STUN/TURN ile doğrudan bağlantı. Supabase, Firebase veya özel backend gerekmez.
- **Oda sahibi yetkili akış:** Oyun durumu oda sahibinin tarayıcısında tutulur; her oyuncuya yalnızca `redactGameState` ile filtrelenmiş görünüm gönderilir.
- **Belirgin rol ve görev kartı:** Rolünüz, takımınız, göreviniz ve yetenekleriniz oyun içinde öne çıkar.
- **Büyük Evet/Hayır oyları:** Hükümet oylamasında iki büyük kart; ilk üç reforma kadar oylar gizli, sonrasında açık.
- **16 avatar** ve cihazda saklanan profil.
- **Reform destesi:** 8 demokratik + 12 otokrat reform, iki ayrı çizelge.
- **Gizli oylama:** İlk üç reform tamamlanana kadar yalnızca kabul/ret sonucu açıklanır; sonrasında açık oylama başlar. Ağırlıklı Büyük Vezir oyu, 3 ret sonrası otomatik reform.
- **Soruşturma**, 3. reform özel yetkileri, tutuklama, liderlik devri, tasfiye.
- **Kazanma koşulları:** demokratik, otokratik ve Nötr kişisel zafer.
- **PWA:** yüklenebilir uygulama, çevrimdışı kabuk, üretilmiş ikonlar.
- **Testler:** rol dağılımı, fazlar, oylama, ağırlıklar, engelleme, otomatik reform, geçişler, Nötr, 3. reform güçleri, tutuklama, liderlik devri, tüm kazanma koşulları, tasfiye, redaksiyon, botlar ve oda sahibi yetkili oda akışı.

---

## Hızlı başlangıç

Gereksinimler:

- **Node.js 20 veya üzeri** (bu depo Node 26 ile de geliştirildi)
- npm

```bash
git clone https://github.com/duperious/hukum-yolu.git
cd hukum-yolu
npm install
npm run dev
```

Tarayıcıda terminalin gösterdiği adresi açın (genellikle `http://localhost:5173`).

**Ortam değişkeni gerekmez.** `.env` dosyası, Supabase projesi veya veritabanı kurulumu yoktur. Online odalar PeerJS’in genel sinyal sunucusu ve WebRTC üzerinden çalışır.

---

## Online oyun nasıl çalışır?

1. **Oda oluşturulur.** Oda sahibi “Oyun Oluştur” der. Altı karakterlik bir oda kodu üretilir. Oda kodu, PeerJS peer kimliğine dönüştürülür.
2. **Oyuncular eşleşir.** Kod veya davet bağlantısı paylaşılır. İstemciler PeerJS’in genel sinyal sunucusuna bağlanır; WebRTC teklifi/yanıtı ve ICE adayları bu kanaldan geçer. Bağlantı kurulduktan sonra oyun verisi doğrudan oda sahibi ile istemci arasında akar.
3. **Oda sahibi yetkilidir.** Lobide hazır durumu, bot ekleme, oyun başlatma; oyun sırasında adaylık, oy sayımı, kart dağıtımı, yetkiler ve kazanma koşulları oda sahibinin tarayıcısındaki motor tarafından uygulanır.
4. **Herkes kendi görünümünü alır.** Oda sahibi ham `GameState`’i tutar; istemcilere `redactGameState` çıktısı gönderilir. Böylece diğer oyuncuların rolleri, destesi ve gizli bilgileri istemciye sızmaz.
5. **Oda sahibi sekmesi açık kalmalıdır.** Sekme kapanırsa oda kapanır. Sekme yenilenirse oda durumu aynı tarayıcıdaki `localStorage` kaydından geri yüklenir.

### Saklama anahtarları

| Anahtar | Yer | Amaç |
| --- | --- | --- |
| `hukum-yolu:net:host:v1:CODE` | `localStorage` | Oda sahibinin yetkili oda ve oyun durumu |
| `hukum-yolu:net:token:v1:CODE` | `localStorage` | İstemcinin yeniden bağlanma anahtarı |
| `hukum-yolu:session:v1` | `sessionStorage` | Sekmeye özel aktif oda oturumu (host/client rolü) |
| `hukum-yolu:profile:v1` | `localStorage` | Görünen ad ve avatar |

Aktif oturumun `sessionStorage`’da tutulması, aynı tarayıcıda açılan ikinci sekmenin oda sahibi sekmesinin oturumunu ezmesini engeller.

---

## Oda kurma ve katılma

1. Ana sayfada **Oyun Oluştur** seçin.
2. Profilinizi girin. Oda lobisi açılır.
3. Oda kodunu veya **Davet linki**ni arkadaşlarınıza gönderin.
4. Arkadaşlarınız ana sayfada **Odaya Katıl** ile kodu girer.
5. En az 5, en fazla 10 oyuncu gerekir. Eksikleri **Bot ekle** ile tamamlayın.
6. Tüm insan oyuncular **Hazırım** dediğinde oda sahibi **Oyunu Başlat**’a basar.
7. Rolünüzü görüp onaylayın. Oylamada **Evet** veya **Hayır** kartını seçip oyunuzu gönderin.

Oda kodları karıştırılabilen `I`, `O`, `0` ve `1` karakterlerini içermez.

---

## Bağlantı kopmaları

- Bir insan oyuncunun bağlantısı koparsa **60 saniyelik** bekleme süresi başlar.
- Oyuncu bu süre içinde geri dönerse aynı oyuncu ve aynı rolle devam eder.
- Süre dolarsa:
  - **Lobideyse** odadan çıkarılır.
  - **Oyun sırasındaysa** koltuğu bot devralır. Oyuncunun token’ı korunur; aynı cihazla dönerse botun oynadığı koltuğu geri alabilir.
- Oyuncu bilerek **Ayrıl** derse token’ı silinir; oyun sırasında koltuğu bota devredilir ve geri alınamaz.
- Oda sahibi sekmeyi yenilerse oda durumu `localStorage`’dan geri yüklenir; istemciler otomatik yeniden bağlanmayı dener.
- Oda sahibi **Ayrıl** derse oda kapanır ve oda verisi temizlenir.

---

## GitHub Pages’e yayınlama

Depo, GitHub Actions ile otomatik dağıtım için hazırdır.

### 1. Depoyu GitHub’a gönderin

```bash
git add .
git commit -m "Hüküm Yolu"
git push origin main
```

### 2. Pages kaynağını ayarlayın

GitHub deposunda:

1. **Settings → Pages**
2. **Build and deployment → Source: GitHub Actions**

### 3. Yayınlayın

`main` dalına push ettiğinizde `.github/workflows/deploy.yml` çalışır:

1. `npm ci`
2. `npm test`
3. `npm run build`
4. `dist/` klasörünü GitHub Pages’e yükler

**Supabase anahtarı, Actions secret’ı veya ek ortam değişkeni gerekmez.**

Uygulama **HashRouter** kullandığı için `https://duperious.github.io/hukum-yolu/#/room/ABC234` gibi bağlantılar alt dizinde sorunsuz çalışır. Vite `base: './'` olarak ayarlanmıştır.

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
| `npm run icons` | PWA ikonlarını yeniden üretir |

---

## Proje yapısı

```text
.
├── src/
│   ├── game/              # Saf TypeScript oyun motoru
│   │   ├── config.ts      # Eşikler, rol tablosu, deste, varsayımlar
│   │   ├── engine.ts      # Durum makinesi ve tüm kurallar
│   │   ├── roles.ts       # Rol bilgileri, görevler ve yetenekler
│   │   ├── redact.ts      # Oyuncuya özel güvenli görünüm
│   │   └── ...
│   ├── bots/              # Bot yapay zekâsı
│   ├── net/               # PeerJS/WebRTC oda katmanı
│   │   ├── session.ts     # HostSession / ClientSession
│   │   ├── room.ts        # Yetkili oda durumu ve eylemler
│   │   ├── protocol.ts    # İstemci/host mesaj sözleşmesi
│   │   ├── storage.ts     # Host durumu ve istemci token’ı
│   │   └── roomCode.ts    # Oda kodu, peer kimliği, token
│   ├── components/        # Oyun ve lobi arayüzü
│   ├── pages/             # Ana sayfa, kural rehberi, oda ve katılma sayfaları
│   ├── hooks/             # React hook’ları
│   ├── lib/               # Profil, doğrulama, oturum, yardımcılar
│   └── styles/            # Tema ve bileşen stilleri
├── tests/                 # Motor ve oda testleri
├── public/                # PWA ikonları ve manifest
└── .github/workflows/     # GitHub Pages dağıtımı
```

---

## Güvenlik modeli

Bu proje **host-authoritative** bir oyundur; sunucu tarafından doğrulanan bir sistem değildir. Bunu bilerek oynayın.

- Oda sahibinin tarayıcısı tüm rolleri, desteyi, oyları ve gizli bilgileri tutar.
- Her istemciye yalnızca `redactGameState` ile üretilen kendi görünümü gönderilir. İstemci, başka oyuncuların rollerini normal arayüzden göremez.
- **Oda sahibi teknik olarak tüm rolleri görebilir.** Tarayıcı geliştirici araçları veya `localStorage` ile yetkili durumu inceleyebilir. Arkadaşlar arasında güvenilir bir oda sahibi seçin.
- PeerJS’in genel sinyal sunucusu yalnızca bağlantı kurulumu için kullanılır; oyun verisi WebRTC DataChannel üzerinden doğrudan taşınır.
- Oda kodu ve peer kimliği tahmin edilebilir biçimde türetilir. Oda kodu bilen biri lobi aşamasında katılmayı deneyebilir; oyun başladıktan sonra yeni katılım reddedilir.
- Kimlik doğrulama, hesap sistemi, moderasyon, rate limiting ve kalıcı sunucu kaydı yoktur.
- Oda sahibinin sekmesi kapanırsa oda biter. Bu, “sunucu yok” tasarımının doğal sonucudur.

---

## Bilinen sınırlamalar

- **Oda sahibi sekmesi açık kalmalıdır.** Sekme kapanırsa oda kapanır; oyuncular yeniden bağlanamaz.
- **Oda sahibi tüm rolleri görebilir.** Roller sunucuda değil, oda sahibinin tarayıcısında tutulur.
- **WebRTC ağ koşullarına bağlıdır.** Simetrik NAT, kurumsal güvenlik duvarı veya VPN bağlantıyı engelleyebilir. STUN/TURN sunucuları çoğu ev ağında yeterlidir; her ağda çalışacağı garanti değildir.
- **Bu ortamda gerçek WebRTC bağlantısı test edilemedi.** Kullanılan tarayıcı hiçbir ICE adayı üretmedi; bu nedenle iki cihaz arası canlı oyun doğrulaması yapılamadı. Oda mantığı, redaksiyon ve yetki kontrolleri birim testleriyle doğrulandı.
- **Sohbet, sesli iletişim, moderasyon, hesap sistemi ve kalıcı oda geçmişi yoktur.**
- **Mobil arka plan kısıtlamaları:** Oda sahibi sekmesi arka planda uzun süre kalırsa mobil işletim sistemi sekmeyi askıya alabilir. Oyun sırasında oda sahibi sekmesini ön planda tutun.
- **Oda sahibi cihazı performansı:** Tüm oyun simülasyonu oda sahibinin tarayıcısında çalışır. Çok sayıda bot ve uzun oyunlarda düşük performanslı cihazlarda gecikme olabilir.
- **Üretim sertleştirmesi değildir.** Kimlik doğrulama, hile önleme ve sunucu tarafı yetki doğrulaması yoktur.

---

## Testler

```bash
npm test
npm run typecheck
npm run build
```

Mevcut test kapsamı:

- Rol dağılımı ve rol bilgileri
- Faz geçişleri, adaylık, oylama, oy ağırlıkları
- Üç ret sonrası otomatik reform
- Soruşturma, engelleme, tutuklama, liderlik devri, tasfiye
- Demokratik, otokratik ve Nötr kazanma koşulları
- Redaksiyon: istemciye yalnızca güvenli görünümün gitmesi
- Bot davranışı
- Oda sahibi yetkili oda akışı: oda kurma, katılma, hazır durumu, bot ekleme, oyun başlatma, rol onayı, bot oyuncu reddi, bağlantı kopunca bota devretme ve kopan oyuncunun bot koltuğunu geri alması

---

## Sorun giderme

### “Oda bulunamadı”

- Oda kodunun doğru olduğundan emin olun.
- Oda sahibinin sekmesinin açık olduğunu kontrol edin.
- Oda sahibi sekmeyi yeni yenilediyse birkaç saniye bekleyip tekrar deneyin.

### “Odaya bağlanılıyor” ekranında kalıyorum

- İnternet bağlantınızı kontrol edin.
- Birkaç saniye bekleyin; istemci otomatik yeniden deneme yapar.
- VPN veya kurumsal ağ kullanıyorsanız farklı bir ağ deneyin.
- Sayfayı yenileyin; istemci token’ı varsa aynı oyuncu olarak dönmeyi dener.

### Oda sahibi oyunu kaybetti

- Oda sahibi aynı tarayıcıda `#/room/KOD` adresine dönerse oda durumu `localStorage`’dan geri yüklenir.
- Tarayıcı verisi silindiyse veya farklı bir cihazdan giriliyorsa oda kurtarılamaz.

### Oda sahibi sekmeyi kapattı

- Oda kapanır. Yeni bir oda kurulması gerekir. Bu, sunucusuz tasarımın bilinçli bir sınırıdır.

---

## Kural varsayımları

Rol dağılımı, destedeki kart sayıları, 3 ret kuralı, özel yetkiler, Nötr taraf seçimi, liderlik devri ve kazanma koşulları `src/game/config.ts` ve `src/game/engine.ts` içinde tek kaynak olarak tutulur. Ayrıntılı oyuncu rehberi uygulama içindeki **Nasıl Oynanır?** sayfasındadır.
