# Google Kalendár – pripojenie účtu

## Jednorazové nastavenie správcom
1. V Google Cloud vybrať alebo vytvoriť samostatný projekt Spektra Servis.
2. Povoliť Google Calendar API.
3. Nastaviť Google Auth Platform / OAuth consent screen pre vlastný účet.
   Ak je aplikácia v režime Testing, pridať používaný účet medzi test users.
4. Vytvoriť OAuth Client ID typu Web application.
5. Authorized JavaScript origins: https://spektra-servis.vercel.app
   Bez cesty, lomky na konci alebo #. Pre lokálny test pridať konkrétny origin.
6. V Spektra Servis → Nastavenia a zálohy → Google Kalendár vložiť Client ID.
   Client secret sa nikam nevkladá; tento klient používa Google token model.
7. Uložiť, kliknúť Pripojiť Google účet, udeliť oprávnenia a vybrať kalendár.

Oprávnenia: calendar.events.owned a calendar.calendarlist.readonly.
Cieľom môže byť iba kalendár vlastnený pripojeným účtom.
Verejný Client ID je uložený lokálne. Krátkodobý token zostáva iba v pamäti,
nie v localStorage, IndexedDB, zdrojovom kóde ani zálohách.
Po obnovení stránky alebo vypršaní relácie sa treba znova pripojiť a vybrať kalendár.
Google pripojenie nie je prihlásenie do celej aplikácie ani cloudová databáza.

## Použitie a hranice prvej etapy
V uloženej zákazke s termínom: Synchronizovať s Google → skontrolovať cieľ
aj prenášané údaje → potvrdiť. Prenáša názov, meno zákazníka, adresu, zadanie,
začiatok a koniec. Bez finančných údajov a bez pozývania zákazníkov.
Stabilné ID udalosti je odvodené z ID zákazky, takže opakovaný prenos do toho
istého kalendára aktualizuje existujúcu udalosť. Zmena cieľového kalendára
vytvorí udalosť v novom kalendári; pôvodná zostáva zachovaná.
Ručné ICS importy a staré odkazy sa nepárujú, môžu existovať vedľa API udalosti.
Úprava udalosti používa kontrolu etag. Cudzie, zmazané a udalosti s pozvanými
účastníkmi sa neprepisujú. Pri ručnej zmene v Google ďalší potvrdený prenos
nahradí názov, adresu, popis a termín uloženými údajmi zákazky.
Zrušené zákazky sa neprenášajú a už prenesená udalosť sa automaticky nemaže.
Prenos sa spúšťa iba tlačidlom; nie pri ukladaní zákazky, na pozadí ani spätne
z Google. Odpojenie relácie nemaže udalosti ani neodvoláva trvalý Google súhlas;
ten možno odvolať v nastaveniach účtu Google.

## Overenie
Automatické testy používajú náhradu Google API: stabilné identifikátory,
časové pásmo, vytvorenie raz a následná aktualizácia s etag, zrušenie potvrdenia,
odmietnutie cudzej udalosti a účastníkov. Reálny OAuth a API prenos sa musia
po konfigurácii overiť na skúšobnej zákazke, vrátane vypršania relácie,
zmeny termínu a opakovaného odoslania bez duplicity.

Oficiálna dokumentácia:
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://developers.google.com/workspace/calendar/api/v3/reference/events/patch
