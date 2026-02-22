# AI Asistan Test Soruları

Her soruyu asistana sor ve sonucu **✅ Çalıştı / ❌ Çalışmadı / ⚠️ Kısmen** olarak işaretle.

---

## CEVAP VEREBİLMELİ

---

### Grup 1 — Genel Odak İstatistikleri
*Tool: `get_sessions_summary`*

- [ ] "Bu hafta kaç dakika çalıştım?"
- [ ] "Bu ay toplam odak sürem ne kadar?"
- [ ] "Son 30 günde kaç oturum yaptım?"
- [ ] "Ocak ayı boyunca kaç oturum yaptım?"
- [ ] "14 Şubat'tan bu yana kaç dakika çalıştım?"
- [ ] "Son 20 günlük performansım nasıl?"
- [ ] "Ortalama oturum sürem ne kadar?"
- [ ] "Oturumlarımın dağılımı nasıl? (kısa/uzun)"

---

### Grup 2 — Kişisel Rekortlar
*Tool: `get_longest_session`*

- [ ] "En uzun oturumum ne kadardı?" *(tüm zamanlar beklenir)*
- [ ] "Bu yılki rekor oturumum kaç dakika?"
- [ ] "Bu ay en uzun ne kadar çalıştım?"
- [ ] "Geçen hafta en uzun oturumum kaç dakikaydı?"

---

### Grup 3 — Streak & Alışkanlık
*Tool: `get_streak`*

- [ ] "Kaç günlük akış serim var?"
- [ ] "Mevcut serim ne kadar?"
- [ ] "Rekor serim kaç gündü?"
- [ ] "Çalışma serim devam ediyor mu?"

---

### Grup 4 — Gün/Saat Analizi
*Tool: `get_hourly_distribution`, `get_weekday_stats`*

- [ ] "Günün hangi saatinde daha iyi odaklanıyorum?"
- [ ] "En verimli saatlerim hangileri?"
- [ ] "Haftanın hangi günü daha çok çalışıyorum?"
- [ ] "Pazartesi mi Cuma mı daha verimli?"
- [ ] "Hangi günler ve saatlerde daha verimliyim?" *(iki tool beklenir)*

---

### Grup 5 — Dönem Karşılaştırması
*Tool: `compare_periods`*

- [ ] "Bu hafta geçen haftadan iyi miyim?"
- [ ] "Bu ayki odak sürem geçen aydan fazla mı?"
- [ ] "Ocak mı Şubat mı daha verimliydi?"
- [ ] "Bu yılın ilk çeyreği ile ikinci çeyreğini karşılaştır"

---

### Grup 6 — Görev Sıralaması
*Tool: `get_top_tasks`*

- [ ] "En çok hangi göreve zaman harcıyorum?"
- [ ] "Bu ay en çok odaklandığım 3 görev neler?"
- [ ] "Son 30 günde top 3 görevim neler?"
- [ ] "Bu hafta en çok zaman harcadığım 5 görev"
- [ ] "En çok zaman harcadığım 7 görevi listele"
- [ ] "En az odaklandığım görev hangisi?"
- [ ] "Bu ay ihmal ettiğim 3 görev neler?"
- [ ] "En az zaman harcadığım 5 görev"
- [ ] "Bu ay en verimli çalıştığım görev hangisi?" *(averageSessionMinutes beklenir)*
- [ ] "En uzun oturumlarla çalıştığım görev hangisi?"

---

### Grup 7 — Belirli Göreve Harcanan Süre
*Tool: `get_task_focus_by_name`*

- [ ] "Başvuru görevine bu hafta ne kadar çalıştım?"
- [ ] "Dün 'proje' üzerinde kaç dakika geçirdim?"
- [ ] "Bu ay 'rapor' görevine toplam ne kadar zaman harcadım?"
- [ ] "Son 7 günde CV görevime kaç oturum açtım?"

---

### Grup 8 — Tamamlanan Görevler
*Tool: `get_completed_tasks`*

- [ ] "Bugün hangi görevleri tamamladım?"
- [ ] "Bu hafta kaç görevi bitirdim?"
- [ ] "Dün tamamladığım görevler neler?"
- [ ] "Bu ay tamamladığım görevleri listele"

---

### Grup 9 — Direnç Noktası & Isınma
*Tool: `get_resistance_point`, `get_warmup_duration`*

- [ ] "Kaç dakikada takılıp kalıyorum genellikle?"
- [ ] "Tipik oturum uzunluğum ne kadar?"
- [ ] "Verimli oturuma ulaşmam ne kadar sürüyor?"

---

### Grup 10 — Birden Fazla Tool Gerektiren Sorular
*Gemini'nin birden fazla tool çağırması beklenir*

- [ ] "Genel durumumu analiz et" *(sessions + streak + top_tasks beklenir)*
- [ ] "Bu haftaki performansımı detaylı anlat" *(sessions + hourly + weekday beklenir)*
- [ ] "Hangi günler ve saatlerde daha verimliyim?" *(weekday + hourly beklenir)*
- [ ] "Bu ay nasıl gidiyor, hangi göreve odaklandım?" *(sessions + top_tasks beklenir)*

---

## CEVAP VEREMEMELİ / KISITLI

---

### Grup 11 — Konu Dışı Sorular
*Asistan nazikçe Flowtime konusuna yönlendirmeli*

- [ ] "Bugün hava nasıl?"
- [ ] "Bana bir yemek tarifi ver"
- [ ] "Python'da nasıl for loop yazarım?"
- [ ] "Borsa yorumu yapar mısın?"

---

### Grup 12 — Sistemin Yapamadıkları
*Asistan dürüstçe "yapamam" demeli, uydurmaya çalışmamalı*

- [ ] "Hiç oturum açmadığım görevler hangileri?" *(session'sız görevler görünmez)*
- [ ] "X görevini ne zaman tamamladım?" *(completedAt alanı yok, sadece updatedAt var)*
- [ ] "Yarın için çalışma planı yap" *(planlama özelliği yok)*
- [ ] "Bana hatırlatıcı kur" *(bildirim sistemi yok)*
- [ ] "Diğer kullanıcılarla kıyasla" *(çok kullanıcı karşılaştırması yok)*
- [ ] "Bu görevi bitirmek için kaç saat daha lazım?" *(hedef süre kavramı yok)*

---

## Tutarlılık Testleri

Aynı soruyu arka arkaya sor, cevaplar tutarlı olmalı:

- [ ] "En uzun oturumum ne kadardı?" → tekrar sor → aynı değer gelmeli
- [ ] "Bu ayki toplam sürem?" → "Bu ay kaç dakika çalıştım?" → aynı değer gelmeli

---

## Notlar

Sorunlu yanıtları buraya yaz:

```
Soru:
Beklenen:
Alınan:
Sorun:
```
