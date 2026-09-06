# Stanje prepisivanja zbirke

Zbirka ima **450 zadataka**; uneto je **441**. Tačan broj u svakom trenutku
ispisuje `verify:scoring`, po nivou i oblasti, a na kraju izlaza navodi i
tekstove drugog dela čije telo još čeka:

```bash
pnpm --filter @workspace/api-server run verify:scoring
```

## Kako se zadatak prepisuje

1. Tekst zadatka sa strane iz `Srpski .pdf` (skeniran, bez tekstualnog sloja —
   strane se renderuju u sliku i čitaju vizuelno).
2. **Tačan odgovor isključivo iz odeljka REŠENJA** (PDF strane 184–221), nikad
   iz označenih kružića u samom zadatku — primerak je rešen i mestimično
   pogrešno označen.
3. Zadatak ide u `src/data/questions/<nivo>-<oblast>.ts` (prvi deo) ili u
   `questions/drugi-deo.ts` (uz tekst), sa brojem koji ima u zbirci.
4. Prilozi (plakat, obrazac, rečnik) se seku iz PDF-a u
   `artifacts/srpski-kviz/public/images/zadatak-NNN.png`.

## Šta još nedostaje

### 1. Odlomci uz zadatke drugog dela

Zadaci su uneti i boduju se; nedostaje samo telo samih odlomaka. U
`src/data/texts.ts` svaki takav unos ima `body: [ZA_LEPLJENJE]` — taj red treba
zameniti pasusima, svaki pasus kao poseban string u nizu. `verify:scoring` ih
sam nabraja na kraju izlaza, sa brojem strane u zbirci, pa se ne mogu izgubiti.

Razlog: pisanje dužih doslovnih odlomaka iz objavljenih književnih dela
prekidao je filter sadržaja na strani modela. Kratki odlomci (nekoliko
rečenica) prolaze — zato zadaci, koji citiraju kratke isečke, jesu uneti.
Tekstovi koji su prošli i stoje u celini: *Potraga za Starim Rasom*, Ilićev
*Sveti Sava* i Antićeva *Odluka*.

### 2. Zadatak 144

Zahtev, ponuđeni odgovori i tačni odgovori su upisani; nedostaje `passage` (dva
odlomka sa strana 64–65). Zadatak stoji zakomentarisan u
`questions/napredni-citanje.ts`, sa označenim mestom za lepljenje.

### 3. Zadaci 326–333 — strane koje nedostaju u skenu

Skeniranje nije potpuno. Brojevi strana u podnožju idu 139 → **142** i
187 → **189**, pa u fajlu nema ovih strana:

| Strana knjige | Šta je na njoj | Posledica |
|---|---|---|
| 140–141 | zadaci **326–333** uz Domanovićevu *Vođu* | ne mogu se uneti; rešenja za njih postoje (str. 216), ali bez teksta zahteva unos bi bio nagađanje |
| 188 | poslednja strana pre odeljka REŠENJA | prazna/pregradna — ništa se ne gubi |

Ovo je jedino što se ne može popraviti bez potpunijeg skena.

## Posle svake dopune

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run verify:scoring
```
