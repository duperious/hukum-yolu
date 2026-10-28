# Yapılanlar

> **Önce bu dosyayı oku.** Bu dosya Hüküm Yolu üzerinde yapılan tüm değişikliklerin
> güncel kaydıdır. Farklı bir oturumda çalışmaya başlamadan önce bu dosyayı oku;
> her değişiklikten sonra da buraya yeni bir kayıt ekle. Kayıt eklemeden iş
> bitirilmiş sayılmaz.

- **Proje:** Hüküm Yolu
- **Son güncelleme:** 2026-10-28
- **Son özellik commit'i:** `7727e98` — Rol kartlarını çerçeveye oturt, yerel test ve online rehberi kaldır
- **Bu dosyadaki son değişiklikler:** Commit edildi ve `origin/main` dalına push edildi.

---

## 2026-10-28 — Rol kartları, yerel test ve online rehber temizliği

### 1. Rol kartı görselleri çerçevelerine tam oturtuldu

Sorun: `src/assets/cards/` altındaki yedi rol kartı görselinin bazılarında
krem/papier kenar boşluğu, bazılarında alt tarafta fazladan boşluk vardı.
Görsellerin doğal oranları da birbirini tutmuyordu (324×454, 328×454, 322×454
gibi). Bu yüzden galeride kartlar farklı yüksekliklerde görünüyor ve görsel
dikdörtgen çerçeveyi tam doldurmuyordu.

Yapılanlar:

- Yedi görselin tamamı krem arka plan ve alt kâğıt payından kırpıldı.
- Her görsel 324×454 piksel boyutuna normalize edildi; böylece tüm kartlar aynı
  orana ve aynı boyuta sahip oldu.
- `src/styles/identity.css` içinde `.player-card__frame` için sabit
  `aspect-ratio: 324 / 454`, `overflow: hidden` ve `.player-card__frame img`
  için `width/height: 100%` + `object-fit: cover` eklendi.
- Rol kartı modalındaki `.role-card__card-frame` de aynı oranı kullanacak şekilde
  güncellendi; ileride farklı oranlı bir görsel eklenirse çerçeveden taşmaz.
- Kart galerisindeki başlık/açıklama hizaları artık görsel yüksekliğine göre
  kaymıyor.

Etkilenen dosyalar:

- `src/assets/cards/buyuk-vezir.jpg`
- `src/assets/cards/demokrat-parti-baskani.jpg`
- `src/assets/cards/demokrat-parti-uyesi.jpg`
- `src/assets/cards/istihbarat-baskani.jpg`
- `src/assets/cards/kararsiz.jpg`
- `src/assets/cards/otokrat-parti-baskani.jpg`
- `src/assets/cards/otokrat-parti-uyesi.jpg`
- `src/styles/identity.css`

### 2. Yerel test modu oyundan kaldırıldı

- `/local` rotası ve `src/pages/LocalPage.tsx` kaldırıldı.
- `src/hooks/useLocalGame.ts` kaldırıldı.
- Ana sayfadaki “Yerel Test Oyunu” ve “Yerel Test” butonları kaldırıldı.
- Katılma sayfasındaki “Yerel test” bağlantısı kaldırıldı.
- Kural rehberindeki “Yerel Test”, “Botlara Karşı Oyna” ve “Yerel bot modu”
  girişleri kaldırıldı; rehber artık yalnızca çok oyunculu akışı anlatıyor.
- `GameScreen` ve `EndScreen` içindeki yerel mod dalları, “Yerel test” etiketi ve
  yerel çıkış metinleri kaldırıldı. Oyun ekranı artık çok oyunculu oda akışına
  göre çalışıyor.
- `ErrorBoundary` ve oyun motorundaki yerel teste atıf yapan metinler güncellendi.
- Testlerdeki `mode: 'local'` kullanımları oyun motorunun test kurulumu için
  bırakıldı; bunlar kullanıcı arayüzüne bağlı değil.
- `README.md` giriş, özellik listesi ve proje yapısı yerel test modu ile online
  rehber sayfası kaldırılacak şekilde güncellendi.

Etkilenen dosyalar:

- `src/App.tsx`
- `src/pages/LocalPage.tsx` (silindi)
- `src/hooks/useLocalGame.ts` (silindi)
- `src/pages/HomePage.tsx`
- `src/pages/JoinPage.tsx`
- `src/pages/GuidePage.tsx`
- `src/components/GameScreen.tsx`
- `src/components/EndScreen.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/pages/RoomPage.tsx`
- `src/game/engine.ts`
- `README.md`

### 3. Online rehber sayfası kaldırıldı

- `/setup` rotası ve `src/pages/SetupPage.tsx` kaldırıldı.
- Ana sayfa üst menüsündeki ve alt bilgideki “Online Rehber” bağlantıları
  kaldırıldı.
- Ana sayfadaki “Nasıl Çalışır?” bağlantısı kaldırıldı; sunucusuz oda bilgi
  kutusu korundu.
- Katılma sayfasındaki “Nasıl çalışır?” bağlantısı kaldırıldı.
- Kural rehberindeki “Online Rehber” butonu ve alt bilgi bağlantısı kaldırıldı.
- “Nasıl Oynanır?” kural rehberi (`/guide`) korundu; oyunun kuralları hâlâ
  erişilebilir.

Etkilenen dosyalar:

- `src/App.tsx`
- `src/pages/SetupPage.tsx` (silindi)
- `src/pages/HomePage.tsx`
- `src/pages/JoinPage.tsx`
- `src/pages/GuidePage.tsx`

### 4. Doğrulama

- `npm run typecheck` başarılı.
- `npm run test -- --run` başarılı (56/56).
- `npm run build` başarılı.
- Tarayıcıda kart galerisi, kural rehberi ve ana sayfa bağlantıları kontrol
  edildi.

### 5. Notlar

- `düzenlemeler/` klasörüne dokunulmadı; untracked olarak bırakıldı ve commit
  edilmedi.
- Bu turdaki değişiklikler `7727e98` numaralı commit ile kaydedildi ve push
  edildi.

---

## 2026-10-28 — Commit `1822708`: Görsel oylama ve Nötr seçimi

- Evet/Hayır oylaması metin/ikon yerine görsel kartlarla sunuldu.
  - `src/assets/vote/evet.jpg`
  - `src/assets/vote/hayir.jpg`
- Nötr’ün (Kararsız) taraf seçimi ekranın ortasındaki modal sahneye taşındı.
  - `Cumhuriyet Yolu` = mavi / Demokrat
  - `İmparatorluk Yolu` = kırmızı / Otokrat
  - `src/assets/vote/cumhuriyet-yolu.jpg`
  - `src/assets/vote/imparatorluk-yolu.jpg`
- Yeni `src/components/NotrStage.tsx` eklendi.
- Seçim kartlarında renkli çerçeve ve `Seçildi` rozeti eklendi.
- Nötr seçimi sıra geldiğinde otomatik açılıyor; kapatılırsa `ActionPanel`
  içindeki “Yol Seçimini Aç” butonuyla yeniden açılabiliyor.
- `src/components/VoteStage.tsx`, `src/components/ActionPanel.tsx`,
  `src/components/GameScreen.tsx` ve `src/styles/identity.css` güncellendi.
- Doğrulama: typecheck, 56/56 test ve production build başarılı.

## 2026-10-28 — Commit `cc2a25e`: Soruşturma gizliliği ve karanlık tema

- Soruşturma kaydı `Gizli bir soruşturma yürütüldü.` olarak genelleştirildi.
- Eski `sorguya çekti` kayıtları `src/game/redact.ts` içinde maskeleniyor.
- Soruşturma kimliği ve hedefi oyun günlüğünden ve dönem özetinden gizlendi.
- Karanlık tema kontrastı iyileştirildi.
- İlgili testler eklendi; typecheck, test ve build başarılı.

---

## Değişiklik ekleme şablonu

Yeni bir değişiklikten sonra aşağıdaki şablonu kopyalayıp tarih ve başlıkla
birlikte en üste ekle:

```md
## YYYY-MM-DD — Kısa başlık

### Yapılanlar
- ...

### Etkilenen dosyalar
- ...

### Doğrulama
- `npm run typecheck`
- `npm run test -- --run`
- `npm run build`
```
