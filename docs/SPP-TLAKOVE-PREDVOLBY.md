# SPP: pracovné predvoľby tlakovej skúšky (2026-11-09)

Nové správy už nepredpisujú univerzálne pevnosť 600 kPa / 180 min a tesnosť 6 kPa / 180 min. Staré uložené údaje sa pri načítaní nemenia. Chýbajúci postup starej skúšky sa neodvodzuje z jej nameraných hodnôt.

## Rozsah pracovnej predvoľby

Predvoľba podľa zadania Spektra je obmedzená aplikáciou na nový alebo rekonštruovaný domový úsek za regulátorom, s MOP do 5 kPa a známym kladným vnútorným objemom do 300 l. Ide o rozsah tejto pomôcky, nie o deklaráciu rozsahu technickej normy. Pri prevádzkovej revízii, vyššom MOP, väčšom objeme alebo spotrebiči od 50 kW sa hodnoty automaticky neurčujú.

- Pevnosť: max(5 kPa, 2,5 × MOP), zaokrúhlené nahor na 0,01 kPa.
- Ustálenie: návrh 15 min, oddelene od samotného merania.
- Trvanie: návrh 15 min pri objeme do 50 l vrátane, 30 min nad 50 l.
- Samostatná tesnosť: návrh prevádzkového tlaku zo SOPAS; nepreberá sa okamžite nameraný tlak. Kontrola pracovného profilu porovnáva rozsah prevádzkový tlak až 1,5 × MOP.
- Spoločná skúška: spoločný tlak a trvanie. Namerané tlaky, časy a meradlo sa prenášajú z polí pevnosti až pri skutočnom zadaní technikom. Obe vyhodnotenia ostávajú samostatné.

Tieto numerické pravidlá nie sú overenou transkripciou úplného TPP 704 01-R1:2026. Predvoľba je v rozhraní aj výstupe označená ako pracovná. Pred vydaním musí RT potvrdiť konkrétny postup, tlaky, trvanie a kritériá podľa aktuálneho autentického predpisu a projektu a uviesť jeho článok. Zmena vstupov alebo cieľových hodnôt toto potvrdenie ruší. Ručná úprava cieľových hodnôt prepne na individuálny postup.

## Overené verejné podklady

- [ÚNMS: STN EN 1775:2008](https://normy.normoff.gov.sk/norma/105700/) je vedená ako platná; verejný katalóg neobsahuje úplnú kapitolu skúšania.
- [SPNZ: zrušené TPP](https://www.spnz.sk/zrusene-tpp/) uvádza nahradenie TPP 704 01:2009 vydaním R1 z roku 2026.
- [SPNZ: TPP 704 01-R1](https://www.spnz.sk/produkt/tpp-704-01-r1-odbene-plynove-zariadenia-v-budovach/) verejne uvádza rozsah MOP do 10 kPa a jednotlivé výkony spotrebičov menšie ako 50 kW. Úplné skúšobné ustanovenia nie sú na produktovej stránke dostupné.
- [SPP-D: pripojenie rodinného domu](https://www.spp-distribucia.sk/odberatelia/domacnosti/nove-pripojenie/rodinny-dom/) uvádza doklady nie staršie ako 5 mesiacov; nejde o zdroj univerzálnych skúšobných tlakov.
- Starší verejne zverejnený projekt [Svätý Anton](https://www.svatyanton.sk/download_file_f.php?id=1255186) obsahuje uvedené vzťahy pre pevnosť, samostatnú tesnosť a čas podľa objemu. Je len podporným historickým podkladom, nie náhradou aktuálneho TPP ani projektu konkrétneho úseku.

## Záznamy a kontrola

Predvoľba nevytvára namerané tlaky, nulový pokles, časové odpočty ani výsledok Vyhovela. Po zadaní merania neprepisuje cieľové hodnoty automaticky. Kópia správy zachováva použiteľné údaje o zariadení a meradle, ale vyprázdni merania, teploty, výsledky a potvrdenia predchádzajúcej skúšky.

Vydanie a tlač kontrolujú skutočné hodnoty, zhodu času od-do s trvaním, deformácie, potvrdenie RT a konzistentnosť spoločnej skúšky. Výsledok Vyhovela sa pri rozdielnych tlakoch odmietne; aplikácia nevykonáva automatickú teplotnú kompenzáciu. Neúplný náhľad je označený ako nevydaná správa a nemožno ho vytlačiť tlačidlom aplikácie.

## Overenie zmeny

15 cielených testov SPP prešlo: predvoľby, hraničné objemy, MOP 2 a 2,1 kPa, spoločná skúška, chýbajúce vstupy, odmietnutie rozporných výsledkov, čas cez polnoc, uchovanie starých zápisov, kópie, databázový formát a blokovanie neúplnej tlače. V prehliadači overené predvyplnenie pri MOP 2 kPa a zmena trvania na hranici 50/51 l. Plný build aplikácie nebol lokálne spustený; HTML skript bol skontrolovaný parserom a súvisiace doménové moduly boli pre testy transformované bez zmeny zdroja cez Node.js.
