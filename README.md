# PrzerwaPro - Rejestrator Przerw w Pracy (PWA) ☕⏱️

Nowoczesna progresywna aplikacja webowa (**PWA**) dedykowana do precyzyjnego mierzenia czasu przerw w pracy z limitem **30 minut**, dźwiękowym alarmem ostrzegawczym, miesięcznym kalendarzem, widgetem na pulpit i integracją z **Google Chat**.

---

## 🚀 Główne funkcje

1. **Rejestracja wielu przerw w ciągu dnia:**
   - Przyciski **START** i **STOP** z precyzyjnym licznikiem czasu na żywo.
   - Możliwość robienia dowolnej liczby przerw w ciągu zmiany (np. 3x 10 min, 2x 15 min itp.).
   - Prezentacja łącznego czasu wykorzystanego, pozostałego oraz paska postępu.
   - Możliwość dodania notatki do przerwy (np. obiad, kawa, spacer).

2. **Alarm dźwiękowy (3 minuty przed końcem limitu):**
   - Wbudowany syntezator Web Audio API generujący czyste dźwięki alarmowe bez konieczności pobierania zewnętrznych plików mp3.
   - Ostrzeżenie dźwiękowe 3 minuty przed wyczerpaniem limitu 30 minut.
   - Alarm końcowy po osiągnięciu pełnego limitu.
   - Opcjonalne powiadomienia systemowe i wibracje telefonu.

3. **Reset limitu o północy z możliwością zmiany godziny:**
   - Domyślnie licznik resetuje się o północy (`00:00`).
   - W ustawieniach można wskazać dowolną godzinę resetu (np. `06:00` dla osób pracujących na nocne zmiany).

4. **Miesięczny kalendarz przerw:**
   - Widok siatki kalendarza z oznaczeniem każdego dnia:
     - Zielone oznaczenie: przerwy w normie (do 30 min).
     - Czerwone oznaczenie: przekroczenie limitu.
     - Liczba sesji i łączny czas w minutach.
   - Kliknięcie dnia rozwija szczegółową listę wszystkich przerw z godzinami start/stop i możliwością edycji lub dodania pominiętej przerwy ręcznie.
   - Statystyki miesięczne: suma przerw, średnia na dzień, dni przepracowane.

5. **Integracja z Google Chat (Webhook):**
   - Po podaniu adresu URL webhooka Google Chat, aplikacja automatycznie wysyła powiadomienia:
     - Po kliknięciu **START**: informuje zespół o rozpoczęciu przerwy, godzinie i dotychczasowym bilansie.
     - Po kliknięciu **STOP**: raportuje czas trwania danej przerwy i łączny czas przerw w danym dniu.
   - Proxy backendowe w Express eliminujące blokady CORS w przeglądarce.

6. **Widget na ekran główny bez otwierania aplikacji:**
   - Wsparcie dla **PWA Shortcuts**: na Androidzie przytrzymaj ikonę aplikacji i przeciągnij skrót "Start" lub "Stop" na pulpit jako 1-kliknięciowy widget!
   - Tryb **Pływającego Mini-Widgetu** pozwalający na wygodną pracę na komputerze.

7. **Pełna zgodność z PWA (Progressive Web App):**
   - Działa offline (Service Worker).
   - Przycisk instalacji w aplikacji dla Androida, Chrome, Edge oraz instrukcja dla iOS Safari.
   - Zgodne ikony 192x192, 512x512 oraz maskable.

---

## 🛠️ Uruchomienie lokalne

```bash
# Instalacja zależności
npm install

# Uruchomienie deweloperskie (port 3000)
npm run dev

# Zbudowanie wersji produkcyjnej
npm run build

# Start serwera produkcyjnego
npm start
```

---

## 📦 Wgranie projektu na Twój GitHub

1. Utwórz nowe repozytorium na [github.com/new](https://github.com/new) o nazwie np. `przerwapro`.
2. W terminalu tego projektu wykonaj polecenia:

```bash
git init
git add .
git commit -m "feat: PrzerwaPro - Rejestrator przerw PWA z Google Chat"
git branch -M main
git remote add origin https://github.com/<twoj-login-github>/przerwapro.git
git push -u origin main
```

---

## 🌐 Bezpłatny hosting (np. Vercel / Netlify / Cloud Run)

Po wypchnięciu kodu na GitHub:
1. Zaloguj się na [Vercel](https://vercel.com) lub [Netlify](https://netlify.com).
2. Kliknij **Add New Project** i wybierz swoje repozytorium `przerwapro`.
3. Kliknij **Deploy** – otrzymasz darmową domenę z HTTPS, na której aplikację można od razu zainstalować na telefonie jako PWA!
