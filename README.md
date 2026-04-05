# Aplikácia na vyhľadávanie najlacnejšieho piva v okolí s využitím AI

Webová aplikácia na vyhľadávanie a porovnávanie cien alkoholických nápojov v baroch vo vašom okolí. Stačí vybrať typ nápoja, aplikácia zistí vašu polohu a nájde najbližšie bary zoradené podľa ceny, vzdialenosti, hodnotenia alebo otvorenosti.

---

## Obsah

- [Prehľad](#prehľad)
- [Funkcie](#funkcie)
- [Technológie](#technológie)
- [Inštalácia a spustenie](#inštalácia-a-spustenie)
- [Štruktúra projektu](#štruktúra-projektu)
- [API](#api)
- [Databáza](#databáza)
- [Obmedzenie požiadaviek (Rate Limiting)](#obmedzenie-požiadaviek-rate-limiting)
- [Ďalší možný vývoj](#ďalší-možný-vývoj)
- [Autor](#autor)

---

## Prehľad

Aplikácia je navrhnutá pre mobilné prehliadače aj desktop. Po výbere nápoja (pivo, víno, tvrdý alkohol, drinky) využije GPS lokáciu zariadenia a vyhľadá bary v okruhu až 10 km. Ceny získava kombináciou viacerých metód: z vlastnej databázy, webovým scrapingom stránok barov, OCR rozpoznávaním menu fotografií a ako záložná možnosť generovaním realistických cien.

---

## Funkcie

- **Výber nápoja** — štyri kategórie: Pivo, Víno, Tvrdý alkohol, Drinky
- **GPS lokalizácia** — automatické zistenie polohy s overením presnosti
- **Vyhľadávanie barov** — dynamický okruh 1–10 km cez Google Places API
- **Získavanie cien** — viacvrstvový systém: databáza → web scraping → OCR → generovanie
- **Filtrovanie výsledkov** — zoradenie podľa vzdialenosti, ceny, otvorenosti, hodnotenia
- **Navigácia** — priame otvorenie trasy v Google Maps
- **Cachovanie** — bary a ceny sa ukladajú do databázy pre rýchlejšie budúce dopytovanie
- **Rate limiting** — ochrana API (3 požiadavky / 2 hodiny / IP adresa)
- **Animované pozadie** — 3D časticová animácia (Three.js)
- **Responzívny dizajn** — mobilný dizajn s Tailwind CSS

---

## Technológie

| Vrstva | Technológia |
|--------|-------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| Animácie | Motion (Framer Motion), Three.js, postprocessing |
| UI komponenty | shadcn/ui, Radix UI, Lucide React |
| Backend | Next.js API Routes (serverless) |
| Databáza | Supabase (PostgreSQL) |
| Web scraping | Cheerio |
| OCR | Tesseract.js |
| Externé API | Google Places API, Google Maps |

---

## Inštalácia a spustenie

### Požiadavky

- Node.js 18+
- npm alebo yarn
- Supabase projekt
- Google Cloud API kľúč (Places API, Maps API)

### Kroky

1. **Klonovanie repozitára**

```bash
git clone https://github.com/spevak/maturitna-praca-spevak.git
cd maturitna-praca-spevak
```

2. **Inštalácia závislostí**

```bash
npm install
```

3. **Nastavenie premenných prostredia**

Vytvorte súbor `.env.local` v koreňovom priečinku:

```env
GOOGLE_API_KEY=váš_google_api_kľúč
NEXT_PUBLIC_SUPABASE_URL=https://váš-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=váš_supabase_kľúč
```

4. **Spustenie vývojového servera**

```bash
npm run dev
```

Aplikácia beží na [http://localhost:3000](http://localhost:3000).

### Skripty

| Príkaz | Popis |
|--------|-------|
| `npm run dev` | Vývojový server s Turbopackom |
| `npm run build` | Produkčný build |
| `npm run start` | Spustenie produkčného buildu |
| `npm run lint` | Kontrola kódu ESLintom |

---

## Štruktúra projektu

```
maturitna-praca-spevak/
├── app/
│   ├── api/
│   │   ├── bars/route.ts         # Vyhľadávanie barov v okolí
│   │   └── prices/route.ts       # Získavanie cien nápojov
│   ├── globals.css               # Globálne štýly a Tailwind
│   ├── layout.tsx                # Hlavný layout (fonty, metadata)
│   └── page.tsx                  # Hlavná stránka (klientský komponent)
├── components/
│   ├── ui/
│   │   └── tooltip.tsx           # Radix UI tooltip
│   ├── alert.tsx                 # Notifikácie a upozornenia
│   ├── footer.tsx                # Pätička s odkazom na autora
│   ├── navbar.tsx                # Horná navigačná lišta
│   ├── pixel-blast.tsx           # Animované 3D pozadie
│   ├── preloader.tsx             # Úvodná načítavacia animácia
│   ├── search-result.tsx         # Zobrazenie výsledkov s filtrami
│   ├── searching.tsx             # Stav načítavania
│   └── select-drink.tsx          # Výber typu nápoja
├── lib/
│   ├── data/
│   │   └── options.ts            # Konfigurácia typov nápojov
│   ├── rate-limit.ts             # Logika rate limitingu
│   └── utils.ts                  # Pomocné funkcie (cn)
├── public/                       # Statické súbory
├── .env.local                    # Premenné prostredia (nezdieľané)
├── components.json               # Konfigurácia shadcn
├── next.config.ts                # Konfigurácia Next.js
├── postcss.config.mjs            # PostCSS / Tailwind konfigurácia
└── tsconfig.json                 # TypeScript konfigurácia
```

---

## API

### `GET /api/bars`

Vyhľadá bary v okolí zadaných súradníc.

**Query parametre:**

| Parameter | Typ | Popis |
|-----------|-----|-------|
| `lat` | number | Zemepisná šírka |
| `lng` | number | Zemepisná dĺžka |

**Logika:**
1. Overenie rate limitu
2. Vyhľadávanie v Supabase databáze (okruh 1 → 3 → 5 → 7 → 10 km)
3. Ak je menej ako 10 barov — dopytovanie Google Places API
4. Uloženie nových barov do databázy
5. Vrátenie zoznamu zotriedeného podľa vzdialenosti

---

### `POST /api/prices`

Získa ceny nápojov pre zadané bary.

**Telo požiadavky:**

```json
{
  "bars": [...],
  "drinkType": "beer" | "wine" | "spirits" | "cocktails"
}
```

**Logika:**
1. Overenie rate limitu
2. Načítanie cien z Supabase
3. Pre bary bez cien — web scraping HTML stránky baru
4. Ak scraping zlyhá — OCR rozpoznávanie menu fotografií (Tesseract.js)
5. Ako záloha — generovanie realistickej ceny
6. Uloženie cien do databázy
7. Vrátenie barov s cenami a štatistikami

---

## Databáza

### Tabuľka `bars`

| Stĺpec | Typ | Popis |
|--------|-----|-------|
| `id` | uuid | Primárny kľúč |
| `place_id` | text (unique) | ID z Google Places |
| `name` | text | Názov baru |
| `address` | text | Adresa |
| `latitude` | float | Zemepisná šírka |
| `longitude` | float | Zemepisná dĺžka |
| `rating` | float | Hodnotenie Google |
| `open_now` | boolean | Je teraz otvorený |
| `website` | text | URL stránky baru |

### Tabuľka `prices`

| Stĺpec | Typ | Popis |
|--------|-----|-------|
| `id` | uuid | Primárny kľúč |
| `bar_id` | uuid | Cudzí kľúč na `bars` |
| `drink_type` | text | Typ nápoja |
| `drink_name` | text | Názov nápoja |
| `price` | float | Cena v EUR |
| `source` | text | Zdroj (database / scraped / ocr / generated) |

### Tabuľka `rate_limits`

| Stĺpec | Typ | Popis |
|--------|-----|-------|
| `ip_address` | text | IP adresa klienta |
| `endpoint` | text | Endpoint (bars / prices) |
| `request_count` | int | Počet požiadaviek |
| `first_request_at` | timestamp | Prvá požiadavka v okne |
| `last_request_at` | timestamp | Posledná požiadavka |

---

## Obmedzenie požiadaviek (Rate Limiting)

Každý endpoint je obmedzený na **3 požiadavky za 2 hodiny** na IP adresu. Limity sú uložené v Supabase tabuľke `rate_limits`. Pri prekročení limitu dostane klient chybovú odpoveď s HTTP kódom `429 Too Many Requests`.

---

## Ďalší možný vývoj

Toto je maturitný projekt, no aplikácia má potenciál na rozsiahle rozšírenie. Nižšie sú nápady, ako by sa mohla ďalej vyvíjať.

### Mobilná aplikácia

Aplikácia je aktuálne webová, no logika a dizajn sú pripravené na konverziu do natívnej mobilnej aplikácie:

- **React Native / Expo** — zdieľanie veľkej časti kódu s webovou verziou (rovnaký TypeScript, rovnaká API vrstva)
- **Natívna GPS** — rýchlejšia a presnejšia lokalizácia cez `expo-location`
- **Push notifikácie** — upozornenia na akcie v bare (happy hour, špeciálne ponuky)
- **Offline režim** — cachovanie posledných výsledkov cez AsyncStorage
- **Natívna navigácia** — priame spustenie Apple Maps alebo Google Maps
- **App Store / Google Play** — distribúcia bez potreby webového prehliadača

### Prihlasovanie a používateľské účty

- **OAuth** — prihlasovanie cez Google, Facebook alebo Apple ID
- **Osobný profil** — ukladanie obľúbených barov, histórie vyhľadávaní, preferovaného nápoja
- **Supabase Auth** — jednoduchá integrácia so zákazníckou autentifikáciou (e-mail, heslo, OAuth)
- **Roly** — bežný používateľ vs. majiteľ baru (správa vlastného baru a cien)

### Portál pre majiteľov barov

- **Registrácia baru** — majiteľ pridá bar, adresu, fotografie, otváracie hodiny
- **Správa menu** — priame zadávanie cien nápojov bez potreby scrapingu
- **Štatistiky** — počet vyhľadaní, priemerné hodnotenie, porovnanie s konkurenciou
- **Happy hour** — nastavenie časových zliav, ktoré sa zobrazia používateľom v reálnom čase

### Rozšírené vyhľadávanie a filtrovanie

- **Viac kategórií** — nealkoholické nápoje, jedlo, špeciality
- **Cenový filter** — nastavenie maximálnej ceny (napr. max 4 €/pivo)
- **Mapa** — zobrazenie barov priamo na interaktívnej mape (Google Maps alebo Mapbox)
- **AR mód** — rozšírená realita ukazujúca bary a ceny cez kameru telefónu
- **Komunitné hodnotenia** — používatelia overujú a hodnotia presnosť cien

### Spoločenské funkcie

- **Skupinový plán** — pozvanie priateľov, spoločné hlasovanie o bare
- **Zdieľanie** — odoslanie výsledkov cez WhatsApp, iMessage alebo sociálne siete
- **Check-in** — označenie, že ste práve v bare
- **Leaderboard** — používatelia s najviac overenými cenami

### Technické vylepšenia

- **Lepší scraping** — Playwright / Puppeteer pre JavaScript-renderované stránky
- **AI extrakcia cien** — GPT-4o Vision na čítanie menu fotografií s vyššou presnosťou
- **Webhooky** — automatická aktualizácia cien keď bar zmení menu
- **CDN obrázkov** — ukladanie a servirovanie fotiek menu cez Supabase Storage
- **Monitoring** — Sentry pre sledovanie chýb, Vercel Analytics pre návštevnosť
- **Testy** — jednotkové a integračné testy (Vitest, Playwright E2E)

---

## Autor

**Ladislav Spevák**
- Web: [spevak.dev](https://spevak.dev)
- Maturitná práca — 2025/2026

---

> Projekt je vytvorený ako maturitná práca. Kód je určený na vzdelávacie účely.
