# Functional Requirements: Flowtime App

## [Faz 1: Core Operations - Client SDK Driven]
1. **Google Auth:** Firebase Client SDK ile giriş/çıkış.
2. **Task CRUD:** - Görev ekleme (Başlık + Açıklama).
   - Statü değiştirme (Drag & Drop veya Toggle).
   - Silme ve düzenleme.
3. **Flowtime Timer:** - Dinamik mola hesabı ve konfigürasyon yönetimi.
   - Aktif göreve süre loglama.

## [Faz 2: Intelligence & Analytics - API Route Driven]
1. **Focus Analytics:**
   - Haftalık Heatmap verisinin API üzerinden hesaplanıp dönülmesi.
   - Toplam çalışma istatistiklerinin (Daily/Weekly/Monthly) sunucu tarafında agregasyonu.
2. **Distraction Inbox:** - Hızlı notların "To Do"ya dönüştürülmesi (Client SDK).
3. **Smart Suggestions:** - Kullanıcı verisini analiz edip mola önerisi çıkaran API endpoint'i.