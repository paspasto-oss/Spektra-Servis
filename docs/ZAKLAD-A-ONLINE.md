# Spektra Servis – základ a ďalšie etapy

## Základ 18. 10. 2026
Používame existujúce moduly samostatnej aplikácie, nie novú kópiu OpenFieldPro.
Farba značky je #c20000 s tmavočervenými prelivmi.
Priorita: Zákazky, Adresár, Knižnica znalostí. Kalendár, zariadenia,
história zásahov a validované aj šifrované zálohy zostávajú dostupné.
Pri prvej zákazke bez zákazníkov sa po uložení zákazníka otvorí zákazka
s jeho predvyplneným výberom. Zrušenie formulára tento postup zruší.

## Online prevádzka – plán, zatiaľ neimplementované
Cieľ: HTTPS adresa pre mobil aj PC, jeden povolený účet technika,
serverová databáza spoločná pre zariadenia. GitHub uchováva zdrojový kód,
nie servisné údaje. Samotný hosting nemení lokálne dáta na synchronizované.
Pred výberom poskytovateľa overiť aktuálne bezplatné limity, zálohy a
podmienky. Prevádzka bez poplatkov nie je garantovaná navždy.

1. Odsúhlasiť formuláre a mobilné rozhranie na skúšobných údajoch.
2. Pridať autentifikáciu a databázu do oddeleného testovacieho prostredia.
   Zakázať verejnú registráciu; prístup k údajom vynucovať na serveri.
   Tajné kľúče nikdy neukladať do klienta alebo repozitára.
3. Exportovať lokálnu zálohu; pripraviť jednorazový validovaný import
   s kontrolou počtov, väzieb a duplicitných identifikátorov.
4. Overiť neprihlásený a cudzí účet, prihlásenie na PC aj mobile,
   odhlásenie, obnovu po reštarte, súbežné úpravy a obnovu zo zálohy.
5. Až potom použiť skutočné údaje. Určiť správanie pri výpadku siete;
   offline synchronizácia musí riešiť konflikty, nesmie ticho prepisovať dáta.
6. Google Kalendár neskôr cez OAuth a minimálne oprávnenia, stabilné väzby
   udalostí a zákaziek a test opakovaného prenosu bez duplicít. Dnešný
   ručný Google odkaz a ICS export nie sú obojsmerná synchronizácia.

## Kontrola pilotu
Na prázdnom profile: Nová zákazka → uložiť zákazníka → dokončiť zákazku.
Overiť kartu v Adresári a zákazku po obnovení stránky. Zo zákazky uložiť
riešenie do Knižnice znalostí a vyhľadať ho podľa modelu alebo kódu.
Vyskúšať šifrovaný export a obnovu v samostatnom skúšobnom profile.
Skontrolovať šírku 390 px aj desktop, formuláre a spodnú navigáciu.
Produkčná RS2 ani jej archív sa v tejto etape nemenia.
