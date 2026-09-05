# CLAUDE.md

Uputstvo za rad na ovom repozitorijumu.

## Šta je ovo

Aplikacija za pripremu **završnog ispita iz srpskog jezika i književnosti**
(mala matura). Sadržaj je prepisan iz *Zbirke zadataka iz srpskog jezika i
književnosti za završni ispit u osnovnom obrazovanju i vaspitanju*, izdanje
Zavoda za vrednovanje kvaliteta obrazovanja i vaspitanja za školsku 2025/2026.
godinu (skenirani PDF stoji u korenu repoa; nije u gitu — vidi `.gitignore`).

Struktura aplikacije prati strukturu zbirke:

```
Prvi deo   → osnovni / srednji / napredni nivo
               └ 4 oblasti: čitanje · pisano izražavanje · gramatika · književnost
Drugi deo  → odabrani tekstovi + zadaci uz njih
Testovi iz prethodnih godina → zaseban modul (exam_key ≠ NULL)
```

Prioritet je tačnost podataka. Greška u prikazu je neprijatna; netačan tačan
odgovor uči učenika pogrešno pred ispit koji polaže jednom.

## Odakle dolaze tačni odgovori

**Isključivo iz odeljka РЕШЕЊА na kraju zbirke (PDF strane 184–221), nikad iz
označenih kružića u samom zadatku.** Primerak iz kojeg je građa prepisana je
popunjen — nečiji rešeni primerak — i na više mesta pogrešno označen (kod
zadatka 3 lirska pesma je označena kao naučni stil).

Poznata greška u samoj zbirci: pod rešenjem **23** stoji „епитети и
персонификација“, što je odgovor na zadatak 70, a ne na zadatak 23. Odgovor za
23 je izveden iz pravopisnog pravila i to je zabeleženo u komentaru uz zadatak.

Stanje prepisivanja se vidi iz `verify:scoring` — ispisuje broj zadataka po
nivou i oblasti.

## Komande

```bash
pnpm install
pnpm run typecheck
pnpm run build
```

Iz `artifacts/api-server`, ili sa `pnpm --filter @workspace/api-server run <x>`:

| Komanda | Šta radi |
|---|---|
| `verify:scoring` | proverava sve zadatke: strukturu, bodovanje i da tačan odgovor ne curi ka klijentu |
| `verify:exams` | isto za testove sa prethodnih završnih ispita + zbir poena |
| `migrate` | primenjuje SQL migracije iz `lib/db/migrations/` |
| `seed` | prvi admin nalog (`ADMIN_INITIAL_PASSWORD`) |
| `reset-password <korisnik>` | promena lozinke (`NEW_PASSWORD`); bez argumenta lista naloge |

Pre commit-a uvek: `pnpm run typecheck && pnpm --filter @workspace/api-server run verify:scoring && pnpm --filter @workspace/api-server run verify:exams`

Skripte čitaju `.env` iz korena repoa (`src/lib/load-env.ts`).

## Struktura

```
artifacts/api-server/     Express 5, Drizzle, HMAC-SHA256 tokeni
  src/data/types.ts         model zadatka (8 tipova) i oblasti
  src/data/questions/       zadaci, jedan fajl po nivou i oblasti
  src/data/texts.ts         odabrani tekstovi drugog dela
  src/data/exams/           testovi sa prethodnih završnih ispita
  src/lib/scoring.ts        bodovanje vežbanja + sanitizacija
  src/lib/exam-scoring.ts   bodovanje ispita (delimični poeni)
  src/routes/               auth, quiz, exams, admin, health
  scripts/                  verify:scoring, verify:exams, migrate, seed
artifacts/srpski-kviz/    React 19 + Vite, App.tsx + pages/
  public/images/            prilozi uz zadatke (plakat, obrazac, rečnik)
lib/db/                   Drizzle šema + SQL migracije
docs/DEPLOY.md            Render + Postgres, korak po korak
```

## Tipovi zadataka

`single`, `multi`, `fill`, `match`, `order`, `tf`, `pick`, `open`.

- `pick` pokriva sve „подвуци / обој кружиће испод“ zadatke: tekst je isečen na
  žetone (reči, glasove ili rečenice), učenik bira podskup.
- `open` su zadaci pisanog izražavanja i tumačenja. **Server ih ne boduje** i ne
  ulaze u zbir — posle predaje se prikazuje model odgovora iz zbirke. Automatsko
  bodovanje slobodnog teksta bilo bi nagađanje koje kvari statistiku.
- Zadaci povezivanja u kojima je jedan naslov „višak“ dobijaju u desnoj koloni
  stavku „није ниједан од наведених“.

## Pravila koja se ne krše

**Tačni odgovori ne izlaze sa servera pre nego što učenik odgovori.**
`sanitizeQuestion` gradi odgovor polje po polje (nikad `{...q}`), a
`revealQuestion` se šalje tek u odgovoru na predaju. `verify:scoring` proverava
da nijedno polje sa tačnim odgovorom nije u sanitizovanom objektu — ako dodaješ
polje u model zadatka, dopuni i tu listu.

**Server je jedini koji boduje.** Klijent ne računa tačnost ni za prikaz.

**Nivo i oblast se čitaju iz zbirke, ne iz tela zahteva.** Server ih uzima sa
prvog zadatka u predaji i proverava da svi ostali pripadaju istom skupu — inače
bi učenik svoj rezultat upisao u bilo koju oblast.

**Vežbanje i ispit se ne mešaju.** Razlikuju se po `exam_key` (`NULL` =
vežbanje). Bodovanje im je različito (0/1 po zadatku naspram delimičnih poena),
pa je prosek preko oba besmislen.

**Migracije su idempotentne** (`IF NOT EXISTS`). Nova ide kao
`lib/db/migrations/000N_ime.sql`, uz izmenu Drizzle šeme.

**Izmišljeni testovi se ne unose.** Lista testova sa prethodnih ispita je prazna
dok se ne unesu zvanični — učeniku bi izmišljen test delovao kao original.

## Zamke na koje se već naletelo

- **Rezultat po oblasti se ne čita iz jednog pokušaja.** Oblasti se vežbaju
  odvojeno, pa „najbolji ukupni“ pokušaj po pravilu ne sadrži traženu oblast.
  Zato svaki pokušaj nosi `level` i `area`, a najbolji se traži među pokušajima
  te oblasti.
- **Kružići u skeniranoj zbirci nisu pouzdani** — vidi gore.
- **Skenirani PDF nema tekstualni sloj.** `pdftotext` vraća praznu stranu;
  strane se moraju renderovati u sliku (PyMuPDF) i čitati vizuelno.
- **Vite dodaje `crossorigin`** na `<script>` i `<link>`, pa browser šalje
  `Origin` i za fajlove sa istog domena.
- **pnpm-workspace isključuje platforme osim linux-x64 i win32-x64.** Win32-x64
  je bio isključen i on, pa se lokalno ništa nije pokretalo (`@esbuild/win32-x64
  could not be found`); vraćen je za esbuild, rollup, lightningcss i oxide.

## Konvencije

- **Sav tekst u aplikaciji je srpski, ćirilica.** Bez mešanja pisama.
- Poređenje slobodno upisanih odgovora **ne izjednačava ćirilicu i latinicu** —
  na završnom ispitu se piše ćirilicom.
- **Komentari objašnjavaju *zašto*, ne *šta*.**
- Imena promenljivih i baze su engleska/latinična; samo tekst za korisnika je
  ćirilica.
- Poruke commit-a: prvi red šta, telo zašto — na srpskom.

## Šta ne dirati bez razloga

- Brojeve zadataka — to su brojevi iz zbirke i upisani su u već sačuvane
  pokušaje.
- `SESSION_SECRET` — promena odjavljuje sve korisnike.
- Ništa što menja bodovanje pošto učenici počnu da rade.

## Otvoreno

- `quiz_users.password_plain` čuva lozinku u čitljivom obliku da bi je nastavnik
  video u admin panelu. Učenici su maloletni; ako aplikacija izađe iz lokalne
  upotrebe, ovo treba ukloniti zajedno sa prikazom lozinke.
