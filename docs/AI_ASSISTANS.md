# Flowtime AI Asistanı — Nasıl Çalışır?

## Genel Bakış

Flowtime sistemi, kullanıcıların odaklanma alışkanlıklarını analiz etmek ve kişiselleştirilmiş geri bildirim vermek için **Google Gemini AI** modelini kullanır. Asistan, salt bir sohbet botu değildir; kullanıcının gerçek oturum verilerini veritabanından çekerek bu verileri analiz eder ve anlamlı içgörüler üretir.

---

## Kullanılan Teknolojiler

| Katman | Teknoloji |
|---|---|
| AI Modeli | `gemini-2.5-flash-lite` (Google Gemini) |
| AI Kütüphanesi | `@google/genai` |
| Veritabanı | Google Firestore |
| Auth | Firebase (Bearer Token) |
| Backend | Next.js API Routes |
| Frontend | React + localStorage |

---

## Mimari: İki Aşamalı Boru Hattı (Two-Stage Pipeline)

Kullanıcı bir mesaj gönderdiğinde sistem iki aşamalı bir süreç çalıştırır:

```
Kullanıcı Mesajı
       │
       ▼
┌─────────────────────┐
│  1. RESOLVER (AI)   │  ← Hangi metrikler gerekli? Hangi zaman dilimi?
│  Niyeti çözümle     │
└─────────────────────┘
       │
       ▼  JSON çıktı: { period, metrics[] }
       │
┌─────────────────────┐
│  2. VERİ ÇEKME      │  ← Firestore'dan ilgili oturum verileri alınır
│  Metrikleri hesapla │
└─────────────────────┘
       │
       ▼  Hesaplanan veri
       │
┌─────────────────────┐
│  3. ANA ASISTAN     │  ← Verilerle zenginleştirilmiş, kişisel yanıt
│  (AI) Yanıt üret   │
└─────────────────────┘
       │
       ▼
  Kullanıcıya Yanıt
```

### Aşama 1 — Resolver (Niyet Çözümleyici)

- Kullanıcının sorusunu okur ve hangi **metriklerin** ve **zaman diliminin** gerekli olduğunu belirler.
- Gemini'ye Türkçe bir sistem promptu gönderilir.
- Çıktı her zaman saf JSON'dur:
  ```json
  { "period": "last_7_days", "metrics": ["peak_hours", "flow_streak"] }
  ```

**Desteklenen Zaman Dilimleri:**
- `today` — Bugün
- `last_7_days` — Son 7 gün
- `last_30_days` — Son 30 gün
- `last_90_days` — Son 90 gün
- `all_time` — Tüm zamanlar

### Aşama 2 — Ana Asistan

- Resolver'dan gelen JSON ile ilgili metrikler Firestore'dan hesaplanır.
- Hesaplanan veriler sistem promptuna eklenir.
- Gemini, bu verilerle zenginleştirilmiş, kişisel ve samimi bir Türkçe yanıt üretir.

---

## Veri Analizi: 12 Metrik

Asistan, kullanıcının oturum geçmişinden aşağıdaki metrikleri hesaplar:

### 1. `total_sessions` — Toplam Oturumlar
- Toplam oturum sayısı
- Toplam odaklanma süresi (dakika)

### 2. `session_duration_distribution` — Süre Dağılımı
- Oturumların 6-dakikalık aralıklara göre dağılımı
- Kısa / orta / uzun oturumların oranı

### 3. `peak_hours` — Zirve Saatler
- Günün en verimli 3 saati
- Saat bazında toplam odak süresi

### 4. `flow_streak` — Akış Serisi
- Mevcut ardışık verimli gün sayısı
- Kişisel rekor

### 5. `resistance_point` — Direnç Noktası
- Kullanıcının doğal oturum süresi tatlı noktası
- Mod ve medyan analizi ile hesaplanır

### 6. `focus_density_ratio` — Odak Yoğunluğu
- Konsantrasyon kalitesi (mola süresi vs. odak süresi oranı)
- `sharp` (≥%80), `moderate`, `scattered_mind` (<40%) etiketleri

### 7. `earned_freedom_balance` — Kazanılmış Özgürlük
- Her 5 dakika odaklanma için 1 dakika mola hakkı kazanılır
- Kullanılan / kalan mola kredisi

### 8. `session_times_by_weekday` — Haftalık Dağılım
- Haftanın her günü için ortalama ve toplam odak süresi

### 9. `average_session_duration` — Ortalama Oturum
- Ortalama oturum uzunluğu

### 10. `longest_session` — En Uzun Oturum
- Kişisel rekor oturum süresi ve tarihi

### 11. `warmup_duration` — Isınma Süresi
- 20+ dakikalık oturumlara ulaşmak için geçen ortalama süre
- Oturum süresinin ~%22'si olarak hesaplanır

### 12. `task_flow_harmony` — Görev-Akış Uyumu
- En fazla odak süresi alan top 10 görev
- Her görev için oturum sayısı ve toplam dakika

---

## Bellek Yönetimi

Asistan, konuşma geçmişini yönetmek için **kayan pencere + özetleme** yöntemi kullanır:

```
Konuşma Geçmişi (localStorage)
         │
         ▼
  ┌─────────────┐
  │ Son 10 msg  │  ← Aktif bellek (her istek ile Gemini'ye gönderilir)
  └─────────────┘
         │
  > 10 mesaj olursa
         │
         ▼
  ┌─────────────┐
  │  Özet (AI) │  ← Eski mesajlar Gemini ile 3-4 cümleye özetlenir
  └─────────────┘
         │
         ▼
  Özet + Son 10 mesaj → Sonraki istekte kullanılır
```

**Depolama:**
- `localStorage` anahtarı: `flowtime_chat_{userId}`
- Format: `{ messages: ChatMessage[], summary: string | null }`

---

## Hız Sınırlama (Rate Limiting)

Kötüye kullanımı önlemek için:

- **Günlük limit:** Kullanıcı başına **20 mesaj/gün**
- **Uygulama:** Sunucu taraflı bellek deposu (in-memory store)
- Limit aşıldığında Türkçe dostane bir hata mesajı döner

---

## Hata Toleransı ve Yeniden Deneme

Gemini API çağrılarında otomatik yeniden deneme mekanizması:

- **Max 3 deneme**
- **Başlangıç bekleme:** 2 saniye
- **Strateji:** Üstel geri çekilme (exponential backoff)
- **Tetikleyici hatalar:** `503 Service Unavailable`, `429 Too Many Requests`

---

## Asistan Kişiliği

Sistem promptu asistanı şu şekilde tanımlar:

- **Ton:** Samimi, motive edici, arkadaşça
- **Kural 1:** Asistanlığını veya yapay zeka olduğunu asla belirtmez
- **Kural 2:** Verileri sayılarla destekler ama rapor gibi değil, sohbet gibi anlatır
- **Kural 3:** Flowtime metodolojisine hakimdir (oturum, mola, akış durumu)
- **Dil:** Türkçe

---

## Kimlik Doğrulama

Her API isteği Firebase ID Token ile doğrulanır:

```
Authorization: Bearer <firebase-id-token>
```

Sunucu Firebase Admin SDK ile token'ı doğrular ve `userId`'yi çıkarır. Tüm veri sorguları bu `userId` ile filtrelenir.

---

## Veri Akışı Özeti

```
[Kullanıcı] → mesaj gönderir
    ↓
[Next.js API /api/assistant/chat]
    ↓ Firebase Token doğrula
    ↓ Rate limit kontrol
    ↓ Gemini Resolver → hangi metrikler?
    ↓ Firestore → oturum verileri çek
    ↓ metricFunctions.ts → metrikleri hesapla
    ↓ Gemini Ana Asistan → kişisel yanıt üret
    ↓ Bellek yönetimi (10+ mesaj → özetle)
    ↓
[Kullanıcı] → yanıt + güncellenen geçmiş alır
    ↓
[localStorage] → konuşma kalıcı olarak saklanır
```

---

## Dosya Referansları

| Dosya | Görev |
|---|---|
| [src/lib/gemini.ts](../src/lib/gemini.ts) | Gemini API sarmalayıcısı, retry mekanizması |
| [src/pages/api/assistant/chat.ts](../src/pages/api/assistant/chat.ts) | Backend API endpoint, iki aşamalı pipeline |
| [src/features/assistant/utils/metricFunctions.ts](../src/features/assistant/utils/metricFunctions.ts) | 12 metriğin hesaplama mantığı |
| [src/features/assistant/utils/rateLimit.ts](../src/features/assistant/utils/rateLimit.ts) | Günlük kullanım limiti |
| [src/features/assistant/components/AssistantChat.tsx](../src/features/assistant/components/AssistantChat.tsx) | Frontend sohbet arayüzü |
| [src/features/analytics/utils/analyticsCalculations.ts](../src/features/analytics/utils/analyticsCalculations.ts) | Frontend analitik hesaplamaları |
| [src/types/assistant.ts](../src/types/assistant.ts) | TypeScript tip tanımları |
