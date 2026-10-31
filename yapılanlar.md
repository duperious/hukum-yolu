# Yapılanlar

> **Önce bu dosyayı oku.** Bu dosya Hüküm Yolu üzerinde yapılan tüm değişikliklerin
> güncel kaydıdır. Farklı bir oturumda çalışmaya başlamadan önce bu dosyayı oku;
> her değişiklikten sonra da buraya yeni bir kayıt ekle. Kayıtlar **kronolojiktir**:
> en eski değişiklik üstte, en yeni değişiklik altta yer alır.

- **Proje:** Hüküm Yolu
- **Son güncelleme:** 2026-10-31
- **Son özellik commit'i:** `7616847` — Mobil rol onayını ve oylama kartlarını düzenle
- **Bu dosyadaki son değişiklikler:** Mobilde rol kartı onay butonu sabit footer’a alındı ve EVET/HAYIR oylama kartları yan yana getirildi (`7616847`); `main` dalına push edildi.

---

## Commit kronolojisi

| Commit | Tarih | Özet |
| --- | --- | --- |
| `c7e19e4` | 2026-10-26 00:45 | Hüküm Yolu — gizli rollü Türkçe sosyal çıkarım oyunu |
| `7d22532` | 2026-10-26 01:29 | Online oyunu PeerJS/WebRTC’ye taşı, rol/görev arayüzünü iyileştir |
| `6c38548` | 2026-10-26 01:32 | Bağlantı hatalarını yükleme ekranında göster |
| `d5b79ba` | 2026-10-26 03:58 | Arayüzü referans tasarımla yenile |
| `30f8152` | 2026-10-26 11:34 | Oyun ekranını kompaktlaştır, merkez oylama kartı ve olay bandı ekle |
| `a624452` | 2026-10-26 12:25 | Rol kartını doğrudan göster, oylama ve reform kartlarını düzenle |
| `c5b1c83` | 2026-10-26 14:04 | Oyun olaylarını merkezde animasyonla göster, oylamayı ortala |
| `6b9f7db` | 2026-10-27 12:00 | Arayüzü Mazbata kimliğine taşı, dönem geçişi ve adaylık sahnesi ekle |
| `8e09002` | 2026-10-27 13:31 | Reform seçimini merkezî sahneye taşı, tutanak tasarımını yenile |
| `9e52b4b` | 2026-10-27 21:55 | Oyuncu kartları galerisini ekle, tur dışı olayları temizle |
| `d23a3aa` | 2026-10-27 22:15 | Reform çizelgelerini banner tasarımıyla yenile |
| `4b8973b` | 2026-10-27 22:46 | Rol açılışında eşleşen oyuncu kartını göster |
| `ee14836` | 2026-10-28 05:06 | Dönem ritmi ve geçit sahnesini uygula: oy sonucu, yasama açılışı, dönem özeti |
| `dccae3c` | 2026-10-28 20:54 | Soruşturma hakkını 2. dönemden itibaren her dönem yenile |
| `a16dcaa` | 2026-10-28 20:56 | İlk üç dönemden sonra tüm oylamaları açık yap |
| `4f9923a` | 2026-10-28 22:05 | Reform kartlarını görselleştir ve ilerleme kâğıdına yerleştir |
| `cc2a25e` | 2026-10-28 22:27 | Soruşturma kimliğini gizle ve karanlık tema kontrastını düzelt |
| `1822708` | 2026-10-28 22:59 | Oylama ve Nötr seçimini görsel kartlarla modal sahneye taşı |
| `7727e98` | 2026-10-28 23:13 | Rol kartlarını çerçeveye oturt, yerel test ve online rehberi kaldır |
| `4979651` | 2026-10-28 23:13 | Yapılanlar dosyasındaki son commit bilgisini güncelle |
| `6942af8` | 2026-10-28 23:54 | Zorunlu soruşturma, tutuklama adlandırması ve günlük tekrar temizliği |
| `71d4880` | 2026-10-29 | Gizli oylama gizliliği, açık oylama eşiği, blok hedefi görünürlüğü ve 60 sn kopma akışı |

---

## 2026-10-28 — Commit `cc2a25e`: Soruşturma gizliliği ve karanlık tema

- Soruşturma kaydı `Gizli bir soruşturma yürütüldü.` olarak genelleştirildi.
- Eski `sorguya çekti` kayıtları `src/game/redact.ts` içinde maskeleniyor.
- Soruşturma kimliği ve hedefi oyun günlüğünden ve dönem özetinden gizlendi.
- Karanlık tema kontrastı iyileştirildi.
- İlgili testler eklendi; typecheck, test ve build başarılı.

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

---

## 2026-10-28 — Commit `7727e98`: Rol kartları, yerel test ve online rehber temizliği

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
- Ardından `4979651` numaralı commit ile bu dosyadaki son commit bilgisi
  güncellendi.

---

## 2026-10-28 — Yerel: Zorunlu soruşturma, Demokrat/Otokrat kartları ve 2 oy ifşası

### 1. Soruşturma zorunlu ve merkezî modal oldu

Sorun: Soruşturma yalnızca sağ panelde küçük bir düğme olarak duruyordu ve
unutulabiliyordu. Kullanıcı, her dönem soruşturma yapılmadan oyunun ilerlememesi
gerektiğini belirtti.

Yapılanlar:

- `src/components/InvestigationStage.tsx` oluşturuldu. İstihbarat Başkanı'nın
  soruşturma hakkı açıldığında ekranın ortasında zorunlu bir modal açılıyor.
- Modal, hedef seçilip soruşturma gönderilene kadar kapatılamıyor. Escape ve
  arka plana tıklama devre dışı; kapatma düğmesi gizli.
- Soruşturma sırasında oylama, adaylık, reform ve Nötr seçim sahneleri
  bastırılıyor; `EventStage` duraklatılıyor.
- `PowerPanel` içindeki ikinci soruşturma seçici kaldırıldı; panel yalnızca
  durum ve geçmiş sonuçları gösteriyor.
- `src/components/ui/Modal.tsx` bileşenine isteğe bağlı `overlayClassName`
  desteği eklendi. Soruşturma katmanı `z-index: 180` ile diğer sahnelerin
  üstünde tutuluyor.

### 2. Sonuçlar “İyi/Kötü” yerine Demokrat/Otokrat kartıyla gösteriliyor

- Kullanıcının verdiği iki görsel `src/assets/investigation/demokrat.jpg` ve
  `src/assets/investigation/otokrat.jpg` altına alındı.
- `src/components/investigationMeta.ts` sonuç → kart eşlemesini tutuyor:
  `iyi` → Demokrat kartı, `kotu` → Otokrat kartı.
- Sonuç modalı kart görselini, hedefin adını ve Demokrat/Otokrat etiketini
  gösteriyor. “İyi/Kötü” metni kullanıcı arayüzünden kaldırıldı.
- Otokrat Lider ve Nötr soruşturmada Demokrat kartı veriyor; bu durum sonuç
  ekranında ve rehberde açıkça belirtiliyor.
- `PowerPanel`, `RoleCard`, `GuidePage`, roller ve kural metinleri yeni
  terminolojiye ve zorunlu soruşturma kuralına göre güncellendi.

### 3. 4. dönemde Büyük Vezir’in “2 oy” ile ifşa olması düzeltildi

Kök neden:

- Açık oylama `openVotingAfterRound: 3` nedeniyle 4. dönemde başlıyor.
- Büyük Vezir’in tek oya düşmesi ise dönem sayısına değil, **ilk üç reformun
  tamamlanmasına** bağlı (`resolveFirstThree`, `getTotalReforms === 3`).
- 4. döneme girildiğinde henüz üç reform tamamlanmadıysa Büyük Vezir hâlâ
  2 oy gücünde kalıyor. Oylama sonucu ekranındaki `VoteBreakdown` oyları
  ağırlığa göre sıralıyor ve `2 oy` rozetini gösteriyordu; bu da vezirin
  kimliğini ifşa ediyordu.

Yapılanlar:

- `VoteBreakdown` artık oyları ağırlığa göre sıralamıyor; yalnızca Evet/Hayır
  gruplaması korunuyor.
- `2 oy` rozeti yalnızca rolü zaten herkese açıklanmış Büyük Vezir için
  gösteriliyor.
- `redact.ts` içindeki `publicTally`, rolü açıklanmamış Büyük Vezir’in 2 oylu
  ağırlığını istemciye gönderilen oy listesinde 1 olarak maskeliyor. Engellenen
  oylar (`0`) olduğu gibi kalıyor.
- Açık oylamada toplam Evet/Hayır sayısı yine ağırlıklıdır; değişiklik yalnızca
  bireysel oy listesindeki kimlik ifşasını engeller.
- Geçiş kuralının kendisi (ilk üç reform) değiştirilmedi. İstenirse Büyük
  Vezir’in 3. dönem sonunda tek oya düşmesi ayrıca kural değişikliği olarak
  değerlendirilebilir.

### Etkilenen dosyalar

- `src/components/InvestigationStage.tsx` (yeni)
- `src/components/investigationMeta.ts` (yeni)
- `src/assets/investigation/demokrat.jpg` (yeni)
- `src/assets/investigation/otokrat.jpg` (yeni)
- `src/components/GameScreen.tsx`
- `src/components/PowerPanel.tsx`
- `src/components/PlayerCards.tsx`
- `src/components/RoleCard.tsx`
- `src/components/TransitionStages.tsx`
- `src/components/ui/Modal.tsx`
- `src/game/config.ts`
- `src/game/engine.ts`
- `src/game/redact.ts`
- `src/game/roles.ts`
- `src/pages/GuidePage.tsx`
- `src/styles/identity.css`
- `tests/engine.test.ts`

### Doğrulama

- `npm run typecheck`
- `npm run test -- --run` — 56 test geçti
- `npm run build`
- Tarayıcıda geçici önizleme ile doğrulandı:
  - 2. dönem oylamasında zorunlu soruşturma modalı otomatik açılıyor.
  - Escape modalı kapatmıyor; oylama sahnesi altta açılmıyor.
  - Demokrat ve Otokrat kart görselleri doğru sonuçla yükleniyor.
- Gizli Büyük Vezir’in oy ağırlığının redaksiyonda 1’e maskelendiğini
  doğrulayan test eklendi.

### Commit

- Yerel değişiklikler hazır. Kullanıcı onayı olmadan commit/push yapılmadı.

---

## 2026-10-28 — Yerel: Tutuklama adlandırması ve günlük tekrar temizliği

### 1. Soruşturma dipnotundaki yazım hatası düzeltildi

- `src/components/InvestigationStage.tsx` içindeki
  `Otokrat Lider ve Nötr da soruşturmada Demokrat kartı verir.` cümlesi
  `Otokrat Lider ve Nötr de soruşturmada Demokrat kartı verir.` olarak
  düzeltildi.
- Aynı metin ve benzer dipnotlar tarandı; başka bir yazım hatası bulunmadı.

### 2. Tekrarlı günlük metinleri sadeleştirildi

- `resolveFirstThree` içindeki idam kaydı
  `Monarşi sona erdi. Büyük Vezir idam edildi. Rolü açıklandı: Büyük Vezir.`
  yerine `Monarşi sona erdi. Büyük Vezir idam edildi.` oldu. “Büyük Vezir”
  bilgisi aynı cümlede ikinci kez yazılmıyor; rol yine `publiclyRevealedRoles`
  üzerinden açıklanmaya devam ediyor.
- `endGame` içindeki `Oyun sona erdi. Kazanan: X. ... X kazandı.` tekrarı
  kaldırıldı. Günlük artık yalnızca `Oyun sona erdi. <kazanma nedeni>` yazıyor.
- `enactPolicy` içindeki `Otokrat Reform reformunu` ifadesi
  `Otokrat Reform kartını` olarak düzeltildi.
- Diğer günlük mesajları tarandı; aynı bilgiyi aynı cümlede iki kez yazan başka
  bir kayıt kalmadı.

### 3. “Suikast” özelliği kullanıcıya “Tutuklama” olarak sunuluyor

- Reform çizelgesi etiketleri, kural rehberi, ana sayfa, rol kartları, eylem
  paneli, olay sahnesi, oyun günlüğü ve README’deki tüm kullanıcıya görünen
  “Suikast/suikast” metinleri “Tutuklama/tutuklama” olarak değiştirildi.
- Başkanın hedef seçme akışı artık “Tutuklama hedefini seç” ve
  “Tutuklamayı Onayla” olarak gösteriliyor.
- Oyun günlüğü `X tutuklandı.` yazıyor; kazanma koşulları
  “Otokrat Lider tutuklanırsa…” biçiminde güncellendi.
- Olay sahnesinde ve günlükte `LockKeyhole` ikonu kullanılıyor; eski
  `Crosshair`/`Skull` ikonları kaldırıldı.
- Oyun dışı kalan oyuncular için arayüzde “Ölü/Öldün” yerine “Oyun dışı”
  kullanılıyor. Bu ifade hem tutuklama hem de Büyük Vezir’in idamı sonrasındaki
  durumu kapsıyor.
- İç kimlikler (`assassinate`, `assassination`, `pendingAssassination`,
  `assassinationAtFascist`, `canAssassinate`) protokol ve `localStorage` ile
  kaydedilmiş oda durumuyla uyumluluk için korundu. Değişiklik yalnızca
  kullanıcıya görünen metinlerde ve ikonlarda yapıldı.

### Etkilenen dosyalar

- `src/components/InvestigationStage.tsx`
- `src/components/ActionPanel.tsx`
- `src/components/EndScreen.tsx`
- `src/components/EventStage.tsx`
- `src/components/GameLog.tsx`
- `src/components/GameScreen.tsx`
- `src/components/GovernmentPanel.tsx`
- `src/components/PlayerCircle.tsx`
- `src/components/PolicyTrack.tsx`
- `src/components/PowerPanel.tsx`
- `src/components/RoleCard.tsx`
- `src/game/config.ts`
- `src/game/engine.ts`
- `src/game/roles.ts`
- `src/pages/GuidePage.tsx`
- `src/pages/HomePage.tsx`
- `README.md`
- `tests/engine.test.ts`
- `yapılanlar.md`

### Doğrulama

- `npm run typecheck`
- `npm run test -- --run` — 56/56 test geçti
- `npm run build`
- Kullanıcıya görünen metinlerde `suikast` araması yapıldı; sonuç kalmadı.
- `yapılanlar.md` en eski kayıt üstte, en yeni kayıt altta olacak şekilde
  kronolojik sıraya getirildi.

### Commit

- Yerel değişiklikler hazır. Kullanıcı onayı olmadan commit/push yapılmadı.
- `düzenlemeler/` klasörüne dokunulmadı; untracked olarak bırakıldı.

---

## 2026-10-29 — Yerel: Oylama gizliliği, açık oylama eşiği ve 60 sn kopma

### 1. Gizli oylama artık yalnızca kabul/ret sonucunu gösteriyor

- `redactGameState`, gizli oylamada `lastVoteTally` ve `termSummary.tally`
  alanlarını `null` döndürüyor; `revealedVotes` boş kalıyor.
- Motor günlüğü gizli oylamada Evet/Hayır sayılarını yazmıyor; yalnızca
  `Hükümet kabul edildi. Başbakan: X.` veya `Hükümet reddedildi. Başbakan: X.`
  kaydı düşüyor.
- Düzeltmeden önce kaydedilmiş oyunlardaki `Oylar kullanıldı — Evet: X,
  Hayır: Y.` metinleri herkese açık günlükten ve dönem notlarından temizleniyor.
- Sonuç ekranı gizli oylamada sayı göstermiyor; “yalnızca hükümetin kabul/ret
  sonucu açıklandı” bilgisini gösteriyor. Açık oylamada Evet/Hayır sayıları ve
  bireysel oy dökümü korunuyor.

### 2. Açık oylama ilk üç reformun tamamlanmasına bağlandı

- `isOpenVoting` artık yalnızca `state.firstThreeResolved` döndürüyor.
  `round > 3` kısayolu ve Büyük Vezir’in oy gücüne bağlı ek koşullar kaldırıldı.
- `openVotingAfterRound` ayarı ve `GameConfig` tip alanı kaldırıldı.
- İlk üç reform gecikirse dönem sayısına bakılmaksızın oylar gizli kalıyor;
  üçüncü reform tamamlandığında açık oylama başlıyor.
- Rehber, lobi özeti, oy kartı, adaylık ekranı ve README metinleri yeni eşiğe
  göre güncellendi.

### 3. Blok hedefi açık oylamada görünür, gizli oylamada saklı

- `useBlockMut` günlüğü açık oylamada
  `X, Y’in oyunu engelledi.` yazıyor; gizli oylamada hedefin adı
  `X bir oyuncunun oyunu engelledi.` biçiminde gizleniyor.
- Açık oylamada `lastVoteTally.blockedPlayerId` istemciye gidiyor ve sonuç
  ekranı `Y’in oyu engellendi` rozetini gösteriyor. Gizli oylamada hedef
  kimliği kamuya gitmiyor.
- Kural varsayımları ve rehberde blok görünürlüğü açıklandı.

### 4. Mobil kopmada 60 saniye ve bot koltuğunu geri alma

- `DISCONNECT_GRACE_MS` 45.000 → 60.000 olarak değiştirildi.
- `convertPlayerToBot(..., { reclaimable: true })` kopma kaynaklı devirde
  token’ı koruyor. Bilerek **Ayrıl** yolunda token hâlâ siliniyor.
- Yeni `reclaimBotSeat` fonksiyonu, token’ı korunmuş bot koltuğunu dönen
  oyuncuya geri veriyor; oda kaydında ve oyun motorunda `isBot` false yapılıyor.
- `ClientSession`, `visibilitychange` olayıyla sekmeye dönüşte kopmuş bağlantıyı
  beklemeden yeniden deniyor.
- Token’ı silinmiş (bilerek ayrılan) oyuncu koltuğu geri alamıyor.
- `vite.config.ts` PWA önbelleğine `jpg` ve `jpeg` eklendi; reform/oy kartı
  görselleri çevrimdışı kabukta yer alıyor.

### Etkilenen dosyalar

- `src/game/helpers.ts`
- `src/game/redact.ts`
- `src/game/engine.ts`
- `src/game/config.ts`
- `src/game/types.ts`
- `src/net/room.ts`
- `src/net/session.ts`
- `src/net/types.ts`
- `src/components/TransitionStages.tsx`
- `src/components/ActionPanel.tsx`
- `src/components/VoteStage.tsx`
- `src/components/NomineeStage.tsx`
- `src/components/LobbyView.tsx`
- `src/pages/GuidePage.tsx`
- `README.md`
- `vite.config.ts`
- `tests/engine.test.ts`
- `tests/room.test.ts`
- `yapılanlar.md`

### Doğrulama

- `npm run typecheck`
- `npm run test -- --run` — 58/58 test geçti
- `npm run build` — PWA 40 kayıt oluşturdu; `jpg` görselleri precache listesinde
- Eski “4. dönemden itibaren”, “ağırlıklı toplam” ve “oylar gizli kalır”
  metinleri tarandı; kullanıcıya görünen yerde kalmadı.

### Commit

- `71d4880` olarak commit edildi ve `main` dalına push edildi.
- `düzenlemeler/` klasörüne dokunulmadı; untracked olarak bırakıldı.

---

## 2026-10-29 — Yerel: Soruşturma temposu ve Demokratik zafer eşiği

### 1. İstihbarat sorgusu iki dönemde bir

- `GAME_CONFIG.powers.investigationCadenceRounds` ayarı `2` olarak eklendi.
- `canInvestigateNow`, 2. dönemden itibaren yalnızca 2, 4, 6… dönemlerinde
  `true` dönüyor. Aradaki dönemlerde İstihbarat Başkanı sorgu yapamıyor.
- Zorunlu soruşturma modalı yalnızca `view.canInvestigate` gerçekten `true`
  olduğunda açılıyor; hakkın olmadığı dönemde oyun akışı kilitlenmiyor.
- `PrivateView` içine `isIntelligenceOfficeHolder` ve `nextInvestigationRound`
  eklendi. Özel Yetkiler paneli, soruşturma hakkı olmayan dönemde bir sonraki
  fırsat dönemini gösteriyor.
- Soruşturma sonucu modalı yalnızca aynı dönemde yapılan sorgu için açılıyor;
  `investigationUsedThisRound` kontrolü eski sonucun sonraki dönemlerde
  yeniden açılmasını engelliyor.
- Kalıcı `GameState` alanı eklenmedi. Tempo `round` üzerinden hesaplandığı
  için mevcut kayıtlı oyunlar migration gerektirmiyor.

### 2. Demokratik zafer eşiği 5 reforma düştü

- `GAME_CONFIG.democraticWinThreshold` 6 → 5 olarak değiştirildi.
- Demokratik çizelge etiketleri son adımı “Demokratik zafer” olacak şekilde
  tek kaynaktan üretiliyor; `PolicyTrack` içindeki ayrı sabit etiket listesi
  kaldırıldı.
- Lobi, ana sayfa, rehber, rol kartları, oyuncu kartı ve README metinleri
  5 reforma göre güncellendi.
- `RULE_ASSUMPTIONS` içindeki soruşturma temposu varsayımı güncellendi.

### Etkilenen dosyalar

- `src/game/config.ts`
- `src/game/engine.ts`
- `src/game/types.ts`
- `src/game/redact.ts`
- `src/game/roles.ts`
- `src/components/InvestigationStage.tsx`
- `src/components/PowerPanel.tsx`
- `src/components/PolicyTrack.tsx`
- `src/components/LobbyView.tsx`
- `src/components/PlayerCards.tsx`
- `src/pages/GuidePage.tsx`
- `src/pages/HomePage.tsx`
- `README.md`
- `tests/engine.test.ts`
- `tests/roles.test.ts`
- `yapılanlar.md`

### Doğrulama

- `npm run typecheck`
- `npm run test -- --run` — 58/58 test geçti
- `npm run build` — PWA 40 kayıt oluşturdu
- Kullanıcıya görünen metinlerde eski “6 Demokratik Reform” ve “her dönem
  soruşturma” ifadeleri tarandı; kalmadı.

### Commit

- `5dd6abd` olarak commit edildi ve `main` dalına push edildi.
- `düzenlemeler/` klasörüne dokunulmadı; untracked olarak bırakıldı.

---

## 2026-10-29 — Rol kartı: Soruşturma notlarındaki oyuncu adları

- İstihbarat Başkanı rol kartındaki “Soruşturma notların” listesinde oyuncu
  adları, rol kartının açık kâğıt zemini yerine koyu tema gövde metin rengini
  miras aldığı için soluk görünüyordu.
- `src/styles/identity.css` içinde `.role-card` kapsamına özel isim rengi,
  font ağırlığı ve boyutu tanımlandı.
- İsimlerin uzun olduğunda üç noktayla kırpılması yerine alt satıra geçmesi
  sağlandı; böylece oyuncu adı her zaman tam okunabiliyor.
- Liste etiketleri rol kartının kâğıt paletine uygun petrol/oxblood tonlarına
  sabitlendi; koyu paneldeki kompakt liste etkilenmedi.

### Etkilenen dosyalar

- `src/styles/identity.css`
- `yapılanlar.md`

### Doğrulama

- `npm run typecheck`
- `npm run test -- --run` — 58/58 test geçti
- `npm run build` — production build başarılı

### Commit

- `8f879e0` olarak commit edildi ve `main` dalına push edildi.
- `düzenlemeler/` klasörüne dokunulmadı; untracked olarak bırakıldı.

---

## 2026-10-29 — Yerel: Başkanın kart incelemesi modal sahnesi

### Yapılanlar

- Kart inceleme aşamasındaki üç kart, sayfanın altındaki karar paneli yerine
  ekranın ortasındaki modal sahneye taşındı.
- Başkanın kart inceleme sırası geldiğinde modal otomatik açılıyor; oyuncunun
  kartları görmek için sayfayı kaydırması gerekmiyor.
- “Kartları Desteye Geri Koy” eylemi modalın altına alındı; kartlar aynı
  sırayla desteye dönüyor.
- Modal kapatılırsa karar panelindeki “Kart İncelemeyi Aç” düğmesiyle yeniden
  açılabiliyor.
- Başkan dışındaki oyuncular bekleme durumunu görmeye devam ediyor.
- `PeekStage` bileşeni eklendi; `GameScreen`, `ActionPanel` ve `identity.css`
  güncellendi.

### Etkilenen dosyalar

- `src/components/PeekStage.tsx`
- `src/components/GameScreen.tsx`
- `src/components/ActionPanel.tsx`
- `src/styles/identity.css`
- `yapılanlar.md`

### Doğrulama

- `npm run typecheck`
- `npm run test -- --run` — 58/58 test geçti
- `npm run build` — production build başarılı
- Tarayıcıda geçici oyun durumuyla modalın otomatik açıldığı, kapatılıp
  yeniden açılabildiği ve “Kartları Desteye Geri Koy” eyleminin çalıştığı
  doğrulandı.

### Commit

- `17cc370` olarak commit edildi ve `main` dalına push edildi.
- `düzenlemeler/` klasörüne dokunulmadı; untracked olarak bırakıldı.

---

## 2026-10-29 — Yerel: Demokratlar, Otokratlar ve Yüce İmparator zafer final görselleri

### Yapılanlar

- Demokratlar, Otokratlar ve kırmızı Nötr’ün “Yüce İmparator” zaferi için
  gönderilen final görselleri `src/assets/end/` altına orijinal JPEG olarak
  eklendi.
- Oyun sonu ekranındaki zafer başlığı iki sütunlu poster düzenine geçirildi:
  solda final görseli, sağda zafer başlığı, açıklama ve oyuncu sonucu.
- Nötr’ün kişisel zaferi motorda yalnızca kırmızı tarafı seçip liderliği
  devraldığında gerçekleştiği için bu ekran “Yüce İmparator kazandı” başlığıyla
  gösteriliyor. Mavi tarafı seçen Nötr, Demokrat zaferi ekranını görüyor.
- Üç zafer türünde de poster görünür; poster bulunan zaferlerde eski ikon
  gizleniyor.
- Mobilde poster ve metin tek sütuna düşüyor; görsel okunabilir genişlikte
  kalıyor.

### Etkilenen dosyalar

- `src/assets/end/demokrat-kazandi.jpg`
- `src/assets/end/otokrat-kazandi.jpg`
- `src/assets/end/yuce-imparator-kazandi.jpg`
- `src/components/EndScreen.tsx`
- `src/styles/identity.css`
- `yapılanlar.md`

### Doğrulama

- `npm run typecheck`
- `npm run test -- --run` — 58/58 test geçti
- `npm run build` — production build başarılı
- Tarayıcıda geçici Demokratlar ve Nötr oyun sonu durumlarıyla posterlerin
  yüklendiği ve düzenin render edildiği doğrulandı.

### Commit

- `683084a` olarak commit edildi ve `main` dalına push edildi.
- `düzenlemeler/` klasörüne dokunulmadı; untracked olarak bırakıldı.

---

## 2026-10-29 — Yerel: Oyun sonu ekranını kompaktlaştır

### Yapılanlar

- Oyun sonu ekranındaki poster `232px` genişlikten ekran yüksekliğine göre
  ölçeklenen `132–178px` aralığına indirildi; başlık, alt başlık ve zafer
  nedeni metinleri küçültüldü.
- Panel boşlukları, bölüm iç boşlukları ve liste satırları sıkılaştırıldı;
  “Tüm roller” listesi geniş ekranda iki sütuna alındı.
- Panel, ekrana sığdığında dikey olarak ortalanıyor; içerik uzarsa sayfa
  kaydırılabiliyor.
- Kısa ekranlar için ayrı bir yükseklik kuralı eklendi; poster ve butonlar
  daha da küçülüyor.
- Mobilde poster ve metin tek sütunda kalıyor, rol listesi tek sütuna dönüyor.

### Etkilenen dosyalar

- `src/styles/identity.css`
- `yapılanlar.md`

### Doğrulama

- `npm run build` — production build başarılı
- `npm run test -- --run` — 58/58 test geçti
- Tarayıcıda 1000×700 görünümde 5 ve 10 oyunculu oyun sonu ekranları
  ölçüldü; panel tamamı ekrana sığdı (`scrollHeight === clientHeight`) ve
  sayfa kaydırması oluşmadı.

### Commit

- `4b7e3fe` olarak commit edildi ve `main` dalına push edildi.
- `düzenlemeler/` klasörüne dokunulmadı; untracked olarak bırakıldı.

---

## 2026-10-31 — Yerel: Mobil rol onayı ve oylama kartları

### Yapılanlar

- Rol kartı modalı `100dvh` içine sabitlendi; kart gövdesi kendi içinde
  kaydırılıyor ve “Rolümü Anladım” butonu sabit (sticky) footer’da kalıyor.
- Footer’a güvenli alan (`env(safe-area-inset-bottom)`) eklendi; iPhone’da
  home çubuğu butonu kapatmıyor.
- Footer arka planı kartın kâğıt rengiyle eşleştirildi; kaydırılan içerik
  footer’ın altından görünmüyor.
- Mobilde (≤560px) EVET ve HAYIR kartları tek sütun yerine iki sütuna alındı;
  boşluk 8px’e indirildi. Her iki kart ve “Oyu Onayla ve Gönder” butonu aynı
  ekranda görünüyor.
- Eski tek sütun ve metin tabanlı kart kuralları temizlendi.

### Etkilenen dosyalar

- `src/styles/game.css`
- `src/styles/identity.css`
- `src/styles/era.css`
- `yapılanlar.md`

### Doğrulama

- `npm run test -- --run` — 58/58 test geçti
- `npm run build` — production build başarılı
- Chrome mobil emülasyonunda 390×844, 360×640 ve 320×568 boyutlarında:
  - rol onay butonu görünür ve tıklanabilir; modal sayfası kaymıyor.
  - EVET/HAYIR kartları yan yana, ikisi de tam görünür; gönder butonu da
    ekranda kalıyor.

### Commit

- `7616847` olarak commit edildi ve `main` dalına push edildi.
- `düzenlemeler/` klasörüne dokunulmadı; untracked olarak bırakıldı.

---

## Değişiklik ekleme şablonu

Yeni bir değişiklikten sonra aşağıdaki şablonu kopyalayıp tarih ve başlıkla
birlikte **en alta** ekle:

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
