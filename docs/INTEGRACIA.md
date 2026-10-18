# Cenové ponuky, RS2 a servisná kalkulácia

Táto etapa prepája existujúce aplikácie cez nové okno a jednorazový postMessage prenos. Nejde ešte o spoločnú online databázu Spektra Servisu.

- Navigácia **Ponuky / RS2** otvára existujúce produkčné aplikácie a obsahuje načítanie adresára a skladu POHODA.
- Import vyžaduje prihlásenie v Cenových ponukách. Používa existujúce listCustomers a listStocks a ich oprávnenia. Tokeny sa neprenášajú.
- Presná zhoda mena, firmy, telefónu, e-mailu a adresy sa nepridáva opakovane. Odlišné kontakty zostávajú oddelené; existujúce karty sa neprepisujú.
- Sklad je lokálna kópia obnovovaná na kliknutie. Je súčasťou zálohy. Ceny v uložených kalkuláciách sú samostatné snímky.
- Uložená zákazka má tlačidlá **Kalkulácia servisu**, **Cenová ponuka**, **Správa RS2**.
- Kalkulácia umožňuje materiál, prácu a dopravu, množstvo, cenu bez DPH, nákup a sadzbu DPH. Neznámy nákup sa nezamieňa s nulou. Výsledok sa uloží do konečnej sumy zákazky.
- Pole DPH nie je v existujúcom exporte listStocks. Pri dostatočnej jednotkovej cene sa odvodí z netto/brutto; inak treba sadzbu skontrolovať ručne. Pri vložení neznámej sadzby UI upozorní na predvolených 23 %.
- Ponuka preberá zákazníka aj položky do existujúceho editora ponúk; neukladá sa automaticky. Ponuky majú jednu sadzbu DPH, preto zmiešané sadzby prenos odmietne.
- RS2 preberá kontakt, adresu a zariadenie; merania, technický výsledok, úhradu ani dátum kontroly nevyvodzuje. Pri rozpracovanej správe vyžaduje potvrdenie nahradenia kontaktných údajov. Pred uložením treba skontrolovať celý formulár.
- Dokumenty sa nevracajú automaticky do Servisu a zmeny v iných aplikáciách sa automaticky nesynchronizujú.

## Vydanie

Nasadiť najprv doplnok `spektra-servis-bridge.js` v Cenových ponukách a RS2, potom Spektra Servis. Pôvodné adresy aplikácií zostávajú. Prenos povoľuje výhradne origin `https://spektra-servis.vercel.app`, konkrétne okno a jednorazový identifikátor. Osobné údaje nie sú v URL.

Na skúšku: v skutočnom priestore načítať adresár a sklad, vytvoriť skúšobnú zákazku, pridať položku a prácu, uložiť/obnoviť stránku, preniesť návrh do Ponúk a údaje do RS2. PDF a cloudové uloženie potvrdiť až po kontrole. Povoliť nové okná v prehliadači. Import je potrebný osobitne na každom zariadení.

## Overenie

`npm test` v Spektra Servise; `node --test mobile-v4/tests/servis-bridge.cjs` v Cenových ponukách; `node --test tests/servis-bridge.cjs` v RS2.
Testy pokrývajú výpočty, zálohy, deduplikáciu a izoláciu prenosu. Skutočný prihlásený prenos a mobilné nové okná treba overiť v používateľovom prehliadači.
