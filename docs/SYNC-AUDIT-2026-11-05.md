# Kontrola prepojení – 5. 11. 2026

Opravy v Spektra-Servis, Cenov-ponuky a RS2:

- Obnova synchronizácie a pripojenia nemení existujúci iframe otvorenej ponuky alebo RS2. Rozpracovaný formulár sa nenačíta znova.
- Servis načíta celý adresár po stránkach, nezapisuje nezmenené kontakty a používa kontrolu `updated_at` pred zápisom. Súbežné zmeny rôznych polí zlúči; konflikt rovnakého poľa vyžaduje výber v Nastaveniach. Väzby zákaziek, zariadení a SPP sa zachovajú.
- Výber kontaktu v Ponukách pracuje s globálnou premennou `let current`, nie s neexistujúcim `window.current`. Ručné zadanie iného mena zruší predchádzajúci výber.
- Prenos zo Servisu do Ponúk zachová ID zákazníka, telefón a referenciu zákazky aj po cloudovom uložení. Adresa realizácie je oddelená od adresy kontaktu.
- RS2 používa spoločný atomický resolver kontaktov, ktorý vyžaduje zhodu mena aj telefónu/e-mailu. Nevymazáva existujúce údaje prázdnymi poľami. Uchováva vybraný aj novovytvorený identifikátor zákazníka.
- Neúspešný prenos kontaktu z RS2 zostane vo fronte viazanom na prihlásený účet. Obnoví sa po návrate online, prihlásení alebo počas otvorenej aplikácie. Stav adresára je viditeľný aj po skrytí prihlasovacieho formulára. Bez prihlásenia RS2 výslovne oznámi, že kontakt nebol synchronizovaný.
- Databázový resolver zachová firmu, IČO, DIČ, IČ DPH a pri zmene celej adresy zruší zastarané polia ulica/mesto. Opakované nezmenené zápisy nemenia čas poslednej úpravy. Existujúce RLS a oprávnenia ostávajú zachované.

## Overenie

- Spektra Servis: `npm test` 81/81, `npm run check` úspešný.
- Ponuky: 23/23 cielených testov načítania, atomického ukladania, kontaktov a prenosu zo servisu.
- RS2: 11/11 cielených testov adresára, offline frontu, oddelenia účtov, prenosu a rozloženia archívu.
- Databáza: transakčné testy pod rolou authenticated, normalizované telefóny, rozlíšenie osôb so spoločným telefónom, zachovanie údajov, stabilné ID, nezmenené zápisy a adresa. Testy vrátené cez ROLLBACK; 39 pôvodných kontaktov, žiadne skúšobné kontakty.
- Prehliadač: načítanie Servisu a vloženého RS2, zachovanie hodnoty vo formulári pri opätovnom vykreslení rovnakej agendy.

Plné testovacie balíky obsahujú predchádzajúce zlyhania potvrdené aj na nezmenených základných commitoch: RS2 3 (archive-lookup, payment-account, report-safety); Ponuky 6 v quote-workbench-output (očakávaný starý PDF údaj o revízii). Nie sú započítané medzi úspešné testy tejto opravy.

Overenie v používateľovom súčasne prihlásenom PC a mobile neprebehlo. Aplikácie vyžadujú prihlásenie do rovnakého účtu; Servis navyše zapnutú synchronizáciu. Front RS2 beží pri otvorenej aplikácii. Automatický návrat PDF z Ponúk/RS2 do Servisu táto oprava nepridáva.
