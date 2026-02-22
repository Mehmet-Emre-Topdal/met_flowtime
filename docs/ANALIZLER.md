# Flowtime Analiz Sistemi — Final Yapı

---

## Tasarım Kararları

İki listeyi birleştirirken şu kriterleri kullandım:

- **Veri güvenilirliği:** Türetilmiş varsayım değil, gerçek veriden hesaplanan analizler öncelikli
- **Tekrar yok:** Aynı soruya iki farklı isimle cevap veren analizler birleştirildi
- **Kullanıcı değeri:** Her analiz farklı bir "aha" anı yaratmalı
- **Katman mantığı:** Veri yoksa analiz görünmez, yanıltmaz

---

## BİRİNCİL ANALİZLER (Her zaman çalışır)

---

### 1. 🌊 "Günlük Akış Dalgaları" (Daily Flow Waves)

**Absorbe ettiği analizler:** Akış Parmak İzi

**Kullanıcıya Sağladığı Fayda:**
Hangi saatte zirveye çıktığını, hangi saatte vadi yaşadığını gösterir. Biyolojik saatini verisiyle yüzleştirir. "Öğleden sonra verimsizim" sezgisini sayıyla kanıtlar ya da çürütür.

**Nasıl Görünmeli?**
24 saatlik bir çizgi — zirve noktaları 🔴, vadi noktaları 🔵 ile işaretli. Altında: *"Zirve saatiniz: 10:00-11:00. Vadi saatiniz: 14:00-15:00."*

**Nasıl Hesaplanır?**
24 saat 1'er saatlik slotlara bölünür. Her slot için o saate düşen tüm seansların toplam aktif odak süresi toplanır → "Odak Puanı" elde edilir. Etiketler kullanıcının kendi ortalamasına göre kişiselleştirilir:

- Ortalamanın %130 üzeri → 🔴 Zirve (Peak)
- Ortalamanın %70-130 arası → 🟡 Normal
- Ortalamanın %70 altı → 🔵 Vadi (Trough)

> **Neden Akış Parmak İzi'ni absorbe etti?** İkisi de saat bazlı yoğunluk ölçüyordu. Parmak izi ısı haritası görseldi, Akış Dalgaları ise Peak/Trough etiketiyle daha eyleme geçirilebilir bir içgörü sunuyor. İkisini ayrı tutmak gereksiz tekrar yaratırdı.

---

### 2. ⚡ "Derinlik Skoru" (Depth Score)

**Kullanıcıya Sağladığı Fayda:**
Ham çalışma saatini değil, kaliteli odaklanma süresini gösterir. "6 saat masada oturdum" ile "3s 40dk gerçek akış yaşadım" arasındaki farkı netleştirir.

**Nasıl Görünmeli?**
Tek büyük sayı: **"3s 40dk Derin Çalışma"** — altında: *"Geçen haftanın ortalamasının %20 üzerinde."*

**Nasıl Hesaplanır?**
Seans sürelerine kalite çarpanı uygulanır:

- 25 dakika altı → 0.5x (yüzeysel çalışma)
- 25-50 dakika arası → 1x (odaklı çalışma)
- 50 dakika üzeri → 1.25x (derin akış)

`Derinlik Skoru = Σ (Seans Süresi × Çarpan)`

Geçen haftanın aynı gün ortalamasıyla karşılaştırılarak yüzde fark hesaplanır.

---

### 3. 🎯 "Odak Yoğunluk Oranı" (Focus Density)

**Ayrıldığı analiz:** Derinlik Skoru'ndan bağımsızlaştırıldı

**Kullanıcıya Sağladığı Fayda:**
Ekran başında geçirilen "boş" vakitle "dolu" vakti birbirinden ayırır. Kullanıcı çok çalıştığını sanırken aslında çoğunun boşa geçtiğini görebilir — ya da tam tersi, az ama öz çalıştığını fark edebilir.

**Nasıl Görünmeli?**
Dairesel bir yüzde göstergesi: **%74 Odak Yoğunluğu** — altında kısa yorum etiketi.

**Nasıl Hesaplanır?**
`(Toplam Flowtime Süresi / Toplam Uygulama Açık Süresi) × 100`

Yorum etiketleri:
- %80+ → "Keskin Odak"
- %60-80 → "İyi Ritim"
- %40-60 → "Dağınık Başlangıç"
- %40 altı → "Dağınık Zihin"

> **Neden Derinlik Skoru'ndan ayrıldı?** Derinlik Skoru "ne kadar kaliteli çalıştım" sorusuna, Yoğunluk Oranı ise "zamanımı ne kadar verimli kullandım" sorusuna cevap veriyor. Farklı sorular, farklı analizler.

---

### 4. 💪 "Zihinsel Dayanıklılık Eşiği" (Resistance Point)

**Kullanıcıya Sağladığı Fayda:**
Kullanıcının genellikle kaçıncı dakikada "pes ettiğini" somutlaştırır. Bu noktayı bilen kullanıcı, ona yaklaştığında bilinçli olarak 5 dakika daha devam etmeyi seçebilir.

**Nasıl Görünmeli?**
*"Genellikle 42. dakikada molaya çıkıyorsun."* — Son 7 günün mini çubuk grafiği: eşiğin altındakiler kırmızı, üstündekiler yeşil.

**Nasıl Hesaplanır?**
Manuel sonlandırılan tüm seansların sürelerinin **mod değeri** alınır — bu kişinin doğal bırakma noktasıdır. Uç değerlerin etkisini azaltmak için mod, medyan ile birlikte değerlendirilir; ikisi arasındaki fark %20'yi aşıyorsa medyan baz alınır.

Anlık uyarı: Son 10 seansın medyanı hesaplanır. Günün son seansı bu medyanın %20 altındaysa nazik bildirim: *"Bugün eşiğinin altındasın, bir şeyler mi seni dağıtıyor?"*

---

### 5. 🎁 "Kazanılmış Özgür Zaman" (Earned Freedom)

**Kullanıcıya Sağladığı Fayda:**
Molayı "vakit kaybı" değil, hak edilmiş ödül olarak çerçeveler. Flowtime'ın psikolojik ödül mekanizmasını görünür kılar.

**Nasıl Görünmeli?**
Canlı bakiye: **"🎁 38 dakika mola hakkın birikti"** — mola kullanıldıkça düşer, yeni seans tamamlandıkça artar. Gün sonu kümülatif özet: *"Bu hafta 74 dk kazandın, 61 dk kullandın."*

**Nasıl Hesaplanır?**
`Kazanılan Mola = Seans Süresi / 5`

Her tamamlanan seansten sonra bakiyeye eklenir. Kullanıcı mola başlattığında gerçek mola süresi bakiyeden düşülür.

> **Önemli kural:** Kullanılmayan mola bakiyesi ertesi güne taşınmaz. Flowtime'ın "her gün taze başla" felsefesiyle çelişir.

---

### 6. 🔋 "Odak Kapasitesi Eğrisi" (Natural Flow Window)

**Kullanıcıya Sağladığı Fayda:**
"Ben normalde ne kadar süre kesintisiz odaklanabiliyorum?" sorusunu veriden cevaplar. Kullanıcı bu pencereyi öğrenince kendini zorlamak yerine ritmine göre seans planlar.

**Nasıl Görünmeli?**
Yatay bant: Solda kısa, sağda uzun seanslar. En sık düşülen aralık vurgulanmış. Altında: *"Odak pencereniz genellikle 30-45 dakika."*

**Nasıl Hesaplanır?**
Tüm seans süreleri 5 dakikalık gruplara (bucket) bölünür. En fazla seans düşen ardışık 2-3 grup "dominant pencere" olarak işaretlenir. Uç seansların ortalamayı çarpıtmaması için medyan baz alınır.

Üç aylık periyotlarla karşılaştırma sunulur: *"Geçen ay pencereniz 25-35 dakikaydı, bu ay 35-50 dakikaya çıktı."*

> **Minimum veri:** 20 seans. Altındaysa analiz gösterilmez.

---

### 7. 🔥 "Akış Serisi" (Flow Streak)

**Kullanıcıya Sağladığı Fayda:**
Tutarsızlıkla savaşır. Küçük bir alışkanlık zinciri kurarak her günü bir öncekine bağlar.

**Nasıl Görünmeli?**
Son 30 günü temsil eden daire dizisi. Dolu = akış var, boş = yok. Altında: *"Rekorun: 18 gün. Şu anki serin: 12 gün."*

**Nasıl Hesaplanır?**
Her gün için kişiselleştirilmiş eşik belirlenir: kullanıcının son 30 günlük günlük ortalama Derinlik Skorunun %50'si. O günkü Derinlik Skoru bu eşiği geçiyorsa gün "dolu" sayılır.

Mevcut seri = bugünden geriye gidilerek eşiği geçen ardışık gün sayısı.

> **Neden sabit eşik değil?** "Her gün 30 dakika" gibi sabit bir kural yoğun kullanıcıyı hafife alır, düşük kapasiteli kullanıcıyı hayal kırıklığına uğratır. Kişiselleştirilmiş eşik daha adil ve sürdürülebilir.

---

## İKİNCİL ANALİZLER

---

### 8. ✅ "Görev Akış Uyumu" (Task-Flow Harmony)
*(Yalnızca görev logu girilmişse görünür)*

**Kullanıcıya Sağladığı Fayda:**
Hangi görev tipinde daha uzun akışa girdiğini ve tahmin-gerçek süre farkını gösterir.

**Nasıl Görünmeli?**
Görev kategorileri için tahmini (gri) ve gerçek (renkli) yan yana çubuklar. Yetersiz veri varsa: *"Daha fazla görev etiketledikçe bu analiz şekillenecek."*

**Nasıl Hesaplanır?**
Etiketlenmiş seansların Derinlik Skoru süresi, görevin tahmini süresiyle kıyaslanır. Kategori bazında sapma oranı hesaplanır.

> **Görünürlük eşiği:** Minimum 10 etiketlenmiş seans. Altındaysa analiz hiç gösterilmez.

---

### 9. 🧩 "Bilişsel Isınma Süresi" (Warm-up Phase)
*(Yalnızca yeterli seans verisi ve güvenilir örüntü oluşmuşsa görünür)*

**Kullanıcıya Sağladığı Fayda:**
"İlk 10 dakikayı neden boşa harcıyorum?" sorusunu sayıyla yanıtlar. Isınma süresinin zaman içinde kısalması gizli bir büyüme göstergesidir.

**Nasıl Görünmeli?**
*"Akışa geçiş süreniz ortalama 11 dakika. Geçen aya göre 2 dakika azaldı."*

**Nasıl Hesaplanır?**
Yalnızca başarılı seanslar (20 dakika üzeri) baz alınır. Bu seansların toplam süresinin ilk %22'lik dilimi ısınma fazı olarak kabul edilir.

`Isınma Süresi = Ortalama Başarılı Seans Süresi × 0.22`

> **Neden ikincil?** Bu formül gerçek bir ısınma ölçümü değil, istatistiksel bir tahmindir. Uygulama içi "akıştayım" sinyali veya mikro kesinti takibi olmadan kesin veri üretilemez. Kullanıcıya varsayım, gerçekmiş gibi sunulmaz — yeterli seans birikip örüntü netleşene kadar bu analiz sessiz kalır.

> **Minimum veri:** 30 başarılı seans ve tutarlı örüntü. Standart sapma yüksekse ("her seans çok farklı sürüyor") analiz gösterilmez.

---

## Özet Tablo

| # | Analiz | Katman | Minimum Veri | Temel Soru |
|---|---|---|---|---|
| 1 | Günlük Akış Dalgaları | Birincil | 2 hafta | Ne zaman zirvedeyim? |
| 2 | Derinlik Skoru | Birincil | 1 gün | Ne kadar kaliteli çalıştım? |
| 3 | Odak Yoğunluk Oranı | Birincil | 1 gün | Zamanımı ne kadar verimli kullandım? |
| 4 | Zihinsel Dayanıklılık Eşiği | Birincil | 10 seans | Ne zaman pes ediyorum? |
| 5 | Kazanılmış Özgür Zaman | Birincil | 1 seans | Ne kadar mola hakkım var? |
| 6 | Odak Kapasitesi Eğrisi | Birincil | 20 seans | Doğal odak pencerem ne kadar? |
| 7 | Akış Serisi | Birincil | 7 gün | Ne kadar süredir devam ediyorum? |
| 8 | Görev Akış Uyumu | İkincil | 10 etiketli seans | Görevlerimde ne kadar isabetliyim? |
| 9 | Bilişsel Isınma Süresi | İkincil | 30 başarılı seans | Akışa ne kadar hızlı giriyorum? |