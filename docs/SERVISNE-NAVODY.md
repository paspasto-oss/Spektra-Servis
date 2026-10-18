# Servisné návody PDF – prvá verzia

Knižnica znalostí → Servisné návody PDF → Nahrať servisný návod PDF.
Vyplniť názov, výrobcu a presný model/modelový rad. PDF do 50 MB a 600 strán.
Vyhľadávanie hľadá všetky slová v rámci jednej strany bez diakritiky.
Kódy F.022, F022 a F 022 sú ekvivalentné; F0220 nie je F022.
Výsledky obsahujú úryvok, model a fyzické číslo strany v PDF.
Filter konkrétneho návodu pomáha nezamieňať modely. Výsledok nie je diagnóza.

## Uloženie a súkromie
PDF aj textový index sa spracúvajú v prehliadači cez lokálne poskytované
PDF.js 6.4.299. Neodosielajú sa na server ani do GitHubu.
Samostatná IndexedDB spektra-manuals-v1 nemení databázu zákaziek.
Rovnaký súbor sa rozpoznáva podľa SHA-256. Odstránenie vyžaduje potvrdenie.
Originál je možné stiahnuť. PDF nie sú v JSON zálohe zákaziek; pri zmene
zariadenia alebo strate dát prehliadača ich treba znova nahrať.
Demo priestor návody nezobrazuje. Samostatný HTML súbor bez servera
nepodporuje nahrávanie PDF; používať HTTPS aplikáciu alebo lokálny server.

## Obmedzenia
Bez OCR, AI, synonymického vyhľadávania a cloudovej synchronizácie.
Sken bez textu je odmietnutý; strany bez použiteľného textu sú spočítané.
Heslom chránené PDF zatiaľ nie sú podporované. Tabuľky môžu mať pri
extrakcii pomiešané poradie; výsledok treba porovnať s originálom.
Odkaz #page nemusí na všetkých mobiloch otvoriť presnú stranu.

## Overenie 18. 10. 2026
23 automatických testov prešlo vrátane presných kódov, diakritiky,
vyhľadávania naprieč riadkami a filtra návodu. Dodané 333-stranové PDF
bolo spracované cez PDF.js v Node: 331 strán s použiteľným textom;
F022 aj F.022 našli PDF strany 80, 82 a 274. Obsah ani PDF nie sú v repozitári.
Test extrakcie v Node nenahrádza test prehliadača. Nahratie cez mobil,
obnovenie IndexedDB po reštarte a otváranie strán musí overiť používateľ.
Stiahnutie testovacieho Chromium v tomto prostredí zlyhalo.
