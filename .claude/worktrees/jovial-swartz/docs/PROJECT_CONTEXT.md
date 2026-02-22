# Project Context: Flowtime & Kanban Hybrid

## Core Mission
Flowtime tekniği ile Kanban board'u birleştiren, yüksek görsel kaliteli, performanslı ve güvenli üretkenlik platformu.

## Tech Stack
- **Frontend:** Next.js (Page Router), TypeScript.
- **State & Data:** RTK Query (Ana veri yönetim merkezi).
- **Primary Database Access:** Firebase Client SDK (CRUD işlemleri için).
- **Secondary Database Access:** Next.js API Routes + Firebase Admin SDK (Analitik ve toplu işlemler için).
- **UI:** PrimeReact + Tailwind CSS.

## Data Governance (Hybrid Architecture)
1. **Client-Side SDK:** Görev oluşturma, güncelleme, silme ve anlık sayaç takibi. (Hız ve Real-time için).
2. **Server-Side (API Routes):** Haftalık/aylık raporlar, veri toplama (aggregation) ve Faz 2 analitik hesaplamaları. (Performans ve Güvenlik için).
3. **Security:** - Firebase Security Rules: Veriye erişim sadece sahibi olan `uid` ile sınırlı.
   - App Check: Sadece tanımlı domainden gelen isteklere izin verilecek.

## Development Rules
- **No Comments:** Kodda asla yorum satırı kullanılmayacak.
- **Naming:** Fonksiyon ve değişkenler işlevini tam açıklayacak.
- **RTK Query:** Tüm veri çekme işlemleri (ister API route ister Client SDK olsun) RTK Query içine sarmallanacak (encapsulation).