# CLAUDE.md — Flowtime Project Guide

## Proje Özeti

Flowtime tekniği ile Kanban board'u birleştiren, yüksek görsel kaliteli, performanslı ve güvenli üretkenlik platformu. Kullanıcıların odaklanma alışkanlıklarını takip eder, analiz eder ve AI asistan aracılığıyla kişisel içgörüler üretir.

---

## Tech Stack

| Katman | Teknoloji |
|---|---|
| Frontend | Next.js (Page Router), TypeScript |
| State & Veri | RTK Query |
| Client DB | Firebase Client SDK |
| Server DB | Next.js API Routes + Firebase Admin SDK |
| UI | PrimeReact + Tailwind CSS |
| AI | Google Gemini (`gemini-2.5-flash-lite`) |
| Auth | Firebase (Google Auth) |

---

## Mimari Kurallar

### Hybrid Data Architecture
- **Client SDK:** Görev CRUD, anlık sayaç takibi → hız ve real-time için
- **Server-Side API Routes:** Analitik hesaplamalar, aggregation → performans ve güvenlik için
- **Security:** Firebase Security Rules ile veri erişimi sadece sahibi olan `uid` ile sınırlı

### RTK Query Zorunluluğu
Tüm veri çekme işlemleri — ister API route ister Client SDK olsun — RTK Query içine sarmalanacak.

---

## Kod Yazma Kuralları

- **Yorum yok:** Kodda asla yorum satırı kullanılmaz
- **İsimlendirme:** Fonksiyon ve değişken isimleri işlevini tam olarak açıklamalı
- **Tip güvenliği:** TypeScript strict mod, `any` kullanılmaz
- **Sadelik:** Over-engineering yapma, sadece istenen değişikliği yap

---

## Uygulanan Özellikler

### Faz 1 — Core Operations (Tamamlandı)
- Google Auth ile giriş/çıkış
- Görev CRUD (Başlık + Açıklama)
- Kanban board (Drag & Drop, statü değiştirme)
- Flowtime Timer (dinamik mola hesabı, aktif göreve süre loglama)

### Faz 2 — Intelligence & Analytics (Aktif Geliştirme)
- Focus Analytics (haftalık heatmap, daily/weekly/monthly istatistikler)
- AI Asistan (Gemini tabanlı, iki aşamalı pipeline)
- 12 analitik metrik (peak_hours, flow_streak, focus_density vb.)
- Distraction Inbox (hızlı not → To Do dönüşümü)

---

## AI Asistan Mimarisi

Detaylar için: [AI_ASSISTANS.md](./AI_ASSISTANS.md)

**Mevcut durum:** İki aşamalı pipeline (Resolver + Ana Asistan), sabit metrik listesi ve sabit zaman dilimleri.

**Planlanan:** Gemini Function Calling ile dinamik araç çağrıları — keyfi tarih aralıkları ve esnek sorgular için.

---

## Firestore Koleksiyonları

Detaylar için: [FIRESTORE_SCHEMA.md](./FIRESTORE_SCHEMA.md)

- `users/{userId}` — Kullanıcı profili
- `tasks/{taskId}` — Görevler
- `sessions/{sessionId}` — Odak oturumları (durationSeconds, breakDurationSeconds, taskId, userId)

---

## Önemli Dosyalar

| Dosya | Görev |
|---|---|
| `src/lib/gemini.ts` | Gemini API sarmalayıcısı |
| `src/pages/api/assistant/chat.ts` | AI asistan chat endpoint |
| `src/features/assistant/utils/metricFunctions.ts` | 12 metrik hesaplama fonksiyonu |
| `src/features/analytics/utils/analyticsCalculations.ts` | Frontend analitik hesaplamaları |
| `src/features/assistant/utils/rateLimit.ts` | Günlük 20 mesaj limiti |
| `src/types/assistant.ts` | AI asistan tip tanımları |
