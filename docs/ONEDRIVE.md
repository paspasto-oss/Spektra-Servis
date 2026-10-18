# OneDrive Family – pripojenie a šifrované zálohy

V Nastaveniach je pripravené pripojenie osobného Microsoft účtu. Na aktiváciu treba vlastnú Microsoft Entra registráciu aplikácie a súhlas používateľa. Pred zadaním Client ID sa neodosielajú žiadne dáta do Microsoftu.

## Jednorazové nastavenie

1. V Microsoft Entra → App registrations → New registration vytvoriť **Spektra Servis**.
2. Supported account types: **Personal Microsoft accounts only** (prípadne registrácia podporujúca osobné účty aj organizácie). Aplikácia používa autoritu `consumers`.
3. Authentication → Add platform → **Single-page application (SPA)**.
4. Redirect URI presne `https://spektra-servis.vercel.app/onedrive-callback.html`.
5. Microsoft Graph → Delegated permissions → **Files.ReadWrite.AppFolder**. Implicit grant ani client secret sa nepoužíva.
6. Skopírovať Application (client) ID do Nastavenia → OneDrive. Uložiť a kliknúť Pripojiť OneDrive; vybrať osobný účet s Family úložiskom a odsúhlasiť prístup.

Registrácia vyžaduje dostupný Microsoft Entra tenant a právo registrovať aplikácie. Samotné predplatné Family nemusí poskytnúť možnosť vytvárať registrácie; pri chybe portálu treba vyriešiť registráciu/tenant, nie vytvárať tajné kľúče ani rozširovať prístup k súborom.

## Správanie

- Použitá oficiálna knižnica `@azure/msal-browser` 5.25.1, pevná verzia a lockfile. Login cez popup, autorizačný kód a PKCE spravuje MSAL.
- Samostatná callback stránka obsahuje výhradne MSAL redirect bridge; service worker ju nenahrádza aplikačnou stránkou.
- MSAL tokeny zostávajú v pamäti relácie (`memoryStorage`). Client ID je verejný a uložený lokálne, nie token alebo heslo zálohy.
- Prístup je obmedzený na priečinok `Apps/Spektra Servis` (názov závisí od registrácie); `GET /me/drive/special/approot` ho sprístupní/vytvorí.
- Záloha sa odosiela až po kliknutí na **Uložiť šifrovanú zálohu**. Heslo musí mať aspoň 10 znakov, nemožno ho obnoviť. Používa existujúci AES-GCM/PBKDF2 export.
- Každý súbor má nový časový a náhodný identifikátor, nič sa neprepisuje. Úspech sa zobrazí až po potvrdení názvu, ID a veľkosti súboru serverom.
- Záloha má maximum 25 MB, zhodné s podporou obnovenia. Obsahuje textové údaje aplikácie vrátane skladových kariet a kalkulácií. PDF návody a fotografie zatiaľ neobsahuje.
- Odpojenie vymaže miestnu reláciu. Zálohy a udelený Microsoft súhlas nemaže.
- Obnovenie: súbor stiahnuť z OneDrive a použiť existujúce **Obnovenie zo zálohy** s heslom.
- Toto nie je spoločná databáza, automatická synchronizácia ani automatické zálohovanie na pozadí.

## Overenie

`npm test`: autentifikačná konfigurácia a minimálny rozsah, pamäťová relácia, šifrovaný prenos a obnova, odmietnutie chýbajúceho hesla, chyba nahrávania, odpojenie a callback/service worker.
Skutočný Microsoft login a nahratie treba overiť po registrácii a súhlase používateľa; zatiaľ ich nemožno označiť za funkčne overené.
