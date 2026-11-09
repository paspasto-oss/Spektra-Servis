# SPP: pracovné predvoľby tlakovej skúšky (2026-11-09)

Nové správy už nepredpisujú univerzálne pevnosť 600 kPa / 180 min a tesnosť 6 kPa / 180 min. Staré uložené údaje sa pri načítaní nemenia. Chýbajúci postup starej skúšky sa neodvodzuje z jej nameraných hodnôt.

## Rozsah pracovnej predvoľby

Predvoľba podľa zadania Spektra je obmedzená aplikáciou na nový alebo rekonštruovaný domový úsek za regulátorom, s MOP do 5 kPa a známym kladným vnútorným objemom do 300 l. Ide o rozsah tejto pomôcky, nie o deklaráciu rozsahu technickej normy. Pri prevádzkovej revízii, vyššom MOP, väčšom objeme alebo spotrebiči od 50 kW sa hodnoty automaticky neurčujú.

- Pevnosť: max(5 kPa, 2,5 × MOP), zaokrúhlené nahor na 0,01 kPa.
- Ustálenie: návrh 15 min, oddelene od samotného merania.
- Trvanie: návrh 15 min pri objeme do 50 l vrátane, 30 min nad 50 l.
- Samostatná tesnosť: návrh prevádzkového tlaku zo SOPAS; nepreberá sa okamžite nameraný tlak. Kontrola pracovného profilu porovnáva rozsah prevádzkový tlak až 15 kPa podľa STN EN 1775:2008, čl. 6.6.2, pre MOP do 10 kPa vrátane. Pravidlo 150 % MOP sa vzťahuje na vyššie pásmo, nie na tento profil.
- Spoločná skúška: spoločný tlak a trvanie. Namerané tlaky, časy a meradlo sa prenášajú z polí pevnosti až pri skutočnom zadaní technikom. Obe vyhodnotenia ostávajú samostatné.

Tieto numerické pravidlá nie sú overenou transkripciou úplného TPP 704 01-R1:2026. Predvoľba je v rozhraní aj výstupe označená ako pracovná. Pred vydaním musí RT potvrdiť konkrétny postup, tlaky, trvanie a kritériá podľa aktuálneho autentického predpisu a projektu a uviesť jeho článok. Zmena vstupov alebo cieľových hodnôt toto potvrdenie ruší. Ručná úprava cieľových hodnôt prepne na individuálny postup.

## Overené verejné podklady

- [ÚNMS: STN EN 1775:2008](https://normy.normoff.gov.sk/norma/105700/) je vedená ako platná. Úplná kapitola 6 a čl. 5.2.4 boli 9. 11. 2026 overené v používateľom dodanom skene STN EN 1775 z apríla 2008 (44 strán).
- [SPNZ: zrušené TPP](https://www.spnz.sk/zrusene-tpp/) uvádza nahradenie TPP 704 01:2009 vydaním R1 z roku 2026.
- [SPNZ: TPP 704 01-R1](https://www.spnz.sk/produkt/tpp-704-01-r1-odbene-plynove-zariadenia-v-budovach/) verejne uvádza rozsah MOP do 10 kPa a jednotlivé výkony spotrebičov menšie ako 50 kW. Úplné skúšobné ustanovenia nie sú na produktovej stránke dostupné.
- [SPP-D: pripojenie rodinného domu](https://www.spp-distribucia.sk/odberatelia/domacnosti/nove-pripojenie/rodinny-dom/) uvádza doklady nie staršie ako 5 mesiacov; nejde o zdroj univerzálnych skúšobných tlakov.
- Starší verejne zverejnený projekt [Svätý Anton](https://www.svatyanton.sk/download_file_f.php?id=1255186) obsahuje uvedené vzťahy pre pevnosť, samostatnú tesnosť a čas podľa objemu. Je len podporným historickým podkladom, nie náhradou aktuálneho TPP ani projektu konkrétneho úseku.

## Záznamy a kontrola

Predvoľba nevytvára namerané tlaky, nulový pokles, časové odpočty ani výsledok Vyhovela. Po zadaní merania neprepisuje cieľové hodnoty automaticky. Kópia správy zachováva použiteľné údaje o zariadení a meradle, ale vyprázdni merania, teploty, výsledky a potvrdenia predchádzajúcej skúšky.

Vydanie a tlač kontrolujú skutočné hodnoty, zhodu času od-do s trvaním, deformácie, potvrdenie RT a konzistentnosť spoločnej skúšky. Výsledok Vyhovela sa pri rozdielnych tlakoch odmietne; aplikácia nevykonáva automatickú teplotnú kompenzáciu. Neúplný náhľad je označený ako nevydaná správa a nemožno ho vytlačiť tlačidlom aplikácie.

## Overenie zmeny

15 cielených testov SPP prešlo: predvoľby, hraničné objemy, MOP 2 a 2,1 kPa, spoločná skúška, chýbajúce vstupy, odmietnutie rozporných výsledkov, čas cez polnoc, uchovanie starých zápisov, kópie, databázový formát a blokovanie neúplnej tlače. V prehliadači overené predvyplnenie pri MOP 2 kPa a zmena trvania na hranici 50/51 l. Plný build aplikácie nebol lokálne spustený; HTML skript bol skontrolovaný parserom a súvisiace doménové moduly boli pre testy transformované bez zmeny zdroja cez Node.js.

## Doplnené overenie dodaných noriem (9. 11. 2026)

V používateľových archívoch bolo nájdené TPP 704 01 z júla 2009 (na titulnej strane označené aj Revízia 1, registrácia 2013) a STN EN 1775 z apríla 2008. Samotné označenie R1 preto nestačí na určenie roku vydania. Plný text TPP 704 01-R1:2026 nebol získaný; katalóg SPNZ nie je jeho náhradou. Dodané skeny sa nezverejňujú v repozitári.

Overené miesta STN: str. 18, čl. 5.2.4 (lisovanie, kompatibilita komponentov a náradia); str. 20–23, kapitola 6 (skúšky); tabuľka 1 pri čl. 6.5.2 (pre MOP do 0,1 bar vrátane pevnosť aspoň 2,5 × MOP); čl. 6.6.2 (pri MOP do 100 mbar vrátane horná hranica tesnosti 150 mbar = 15 kPa). Hodnota 15 kPa je strop, nie automatický cieľ skúšky.

Staré TPP 704 01:2009: str. 24–25, čl. 7.7 uvádza minimum 5 kPa, ustálenie 15 min a trvanie podľa objemu 15/30 min; čl. 7.8 hornú hranicu tesnosti 15 kPa; čl. 7.9 citlivosť 10 Pa a presnosť 1 %. Tieto podrobnosti nie sú overené vo vydaní 2026 a nemožno automaticky preniesť ich čísla článkov do novej správy. Aktuálna STN v čl. 6.6.8 ukladá stanovenie trvania oprávnenej osobe so zohľadnením meradla a objemu.

Úprava aplikácie: opravená zámena 1,5 × MOP za 15 kPa pri kontrole tesnosti v pracovnej predvoľbe NTL; doplnené konkrétne overené odkazy na STN a stav dostupnosti nového TPP. Časy a minimum 5 kPa zostávajú výslovne pracovnou predvoľbou do porovnania s úplným TPP 2026. Žiadna migrácia uložených meraní ani automatické potvrdenie zhody.

Overenie tejto úpravy: 19 cielených testov SPP prešlo, vrátane nového prípadu 6 kPa a hranice 15/15,01 kPa pri MOP 2 kPa.
