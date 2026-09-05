# Stanje prepisivanja zbirke

Zbirka ima **450 zadataka**. Tačan broj unetih u svakom trenutku ispisuje
`verify:scoring`, po nivou i oblasti:

```bash
pnpm --filter @workspace/api-server run verify:scoring
```

## Kako se zadatak prepisuje

1. Tekst zadatka sa strane iz `Srpski .pdf` (skeniran, bez tekstualnog sloja —
   strane se renderuju u sliku i čitaju vizuelno).
2. **Tačan odgovor isključivo iz odeljka REŠENJA** (PDF strane 184–221), nikad
   iz označenih kružića u samom zadatku — primerak je rešen i mestimično
   pogrešno označen.
3. Zadatak ide u `src/data/questions/<nivo>-<oblast>.ts`, sa brojem koji ima u
   zbirci.
4. Prilozi (plakat, obrazac, rečnik) se seku iz PDF-a u
   `artifacts/srpski-kviz/public/images/zadatak-NNN.png`.

## Preskočeni zadaci

Ovde stoje zadaci koji su iz nekog razloga ostali neuneti, da se ne izgube.

| Zadatak | Strana | Šta nedostaje | Zašto |
|---|---|---|---|
| 144 | 64–65 | `passage` (dva odlomka) | Pisanje tog teksta tri puta zaredom prekinuo je filter sadržaja na strani modela. Zahtev, ponuđeni odgovori i tačni odgovori su već upisani — stoje zakomentarisani u `napredni-citanje.ts`. |

### Kako dopuniti preskočeni zadatak

Ako se prepisivanje ponovo prekine na istom tekstu, najbrže je da se odlomak
nalepi ručno: otvori odgovarajući fajl u `src/data/questions/`, odkomentariši
zadatak i upiši tekst sa navedene strane u polje `passage`. Ostalo je već tu.

Posle svake dopune:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run verify:scoring
```
