# Google ako hlavný kalendár

Spektra používa existujúci Google účet a zvolený kalendár. Frontend zobrazuje Google udalosti v dennom, týždennom a mesačnom prehľade. Udalosti bez väzby zostávajú iba kalendárovými udalosťami; v detaile možno založiť novú zákazku alebo pripojiť existujúcu.

## Jednorazové zapojenie

1. V Spektre sa prihláste a zapnite cloudovú synchronizáciu pracovného priestoru.
2. V existujúcom Google Cloud projekte povoľte Google Calendar API. Pri zákazníckych e-mailoch aj Gmail API.
3. Na OAuth klientovi typu Web application pridajte presný Authorized redirect URI:
   `https://spektra-servis.vercel.app/google-callback.html`
4. V Spektra → Nastavenia → Google Kalendár vyplňte Client ID a Client secret. Secret sa odošle iba na prihlásený server a uloží do šifrovaného Supabase Vault. Neukladá sa do localStorage, servis_sync ani záloh.
5. Ak chcete trojdňové zákaznícke e-maily, zaškrtnite povolenie Gmailu. Pripojte Google účet a v Google udeľte oprávnenia. Vyberte svoj existujúci hlavný kalendár.
6. OAuth projekt v režime External / Testing zvyčajne poskytuje refresh token na 7 dní pre tieto scope. Na dlhodobú prevádzku je potrebný vhodný produkčný režim a prípadné overenie požadované Google.

Client secret nevkladajte do GitHubu ani do chatu. Pripojenie sa dokončuje v aplikácii.

## Pravidlá prenosu

- Nové alebo upravené zákazky po aktivácii sa prenesú po cloudovom uložení. Staršie zákazky sa hromadne nevkladajú, aby nevznikli kópie už existujúcich Google termínov. Dajú sa preniesť tlačidlom v detaile alebo spárovať s existujúcou udalosťou.
- Predchádzajúce udalosti vytvorené ručným Spektra API prenosom majú stabilné identifikátory; server ich vie rozpoznať. Importy ICS a ručne vytvorené udalosti sa podľa mena či času automaticky nezlučujú.
- Google je rozhodujúci pre čas. Ak sa čas od posledného prenosu zmenil v oboch aplikáciách, použije sa Google a pri zákazke je poznámka o súbehu.
- Pri zrušení Google udalosti sa zákazka označí ako zrušená. Jej dokumenty a kalkulácie sa nevymažú.
- Úpravy sa zapisujú s kontrolou Google ETag. Zmeny zákazky sa vracajú pomocou porovnania celej pôvodnej zákazky v transakcii, takže nové úpravy iného zariadenia nie sú prepísané.
- V Google možno prezerať celodenné a opakované udalosti. Zákazka sa páruje s konkrétnym časovým výskytom s trvaním 5 minút až 24 hodín. Celú opakovanú sériu Spektra neupravuje.
- Server spúšťa kontrolu každých 5 minút aj pri zavretej aplikácii. Pri viac než 40 zákazkách sa kontroly postupne striedajú v dávkach. Kalendár v otvorenej aplikácii načítava údaje každú minútu a pri zmene zobrazeného obdobia.
- Bez internetu ostávajú miestne zákazky. Neúspech Google prenosu sa zobrazuje; nesmie byť interpretovaný ako prázdny kalendár ani vymazanie zákaziek.

## Pozvánky a pripomienky

Odosielanie je pre každú zákazku samostatne vypnuté, kým používateľ nezaškrtne príslušnú voľbu. Musí byť vyplnený e-mail zákazníka.

- Jeden kalendárny mesiac vopred (koniec mesiaca sa skráti na posledný deň predchádzajúceho mesiaca) sa zákazník pridá ako účastník. Google odošle pozvánku s voľbou odpovede.
- Pri bližšom termíne sa pozvánka odošle pri najbližšej kontrole.
- Tri dni vopred Spektra odošle e-mail cez Gmail API z pripojeného účtu. Pripomína aj potvrdený termín; odmietnuté, dokončené a zrušené služby vynechá.
- Odpoveď zákazníka sa načítava zo skutočného Google responseStatus. Aplikácia sama nepotvrdzuje účasť.
- Správy majú záznam viazaný na zákazku, dátum a adresáta. Pri neurčitom výsledku siete sa automaticky neposielajú znova, aby zákazník nedostal duplicitné e-maily. V detaile sa zobrazí požiadavka na kontrolu doručenia.

## Prevádzka backendu

- `docs/google-calendar-server.sql`: schéma, oprávnenia a serverové RPC.
- `supabase/functions/google-calendar/`: Edge Function. Vlastná autentifikácia overuje používateľa cez Supabase Auth a aktívny profil; cron má samostatný náhodný kľúč vo Vault.
- `docs/google-calendar-cron.sql`: plánovač, pg_cron a pg_net.
- OAuth používa PKCE, jednorazový stav viazaný na prihláseného používateľa, pevnú návratovú adresu a kontrolu sessionStorage v prehliadači. Trvalé tokeny sa nikdy nevracajú klientovi.
- Tabuľky `servis_google_*` majú RLS a žiadne práva pre anon/authenticated. Serverové funkcie sú dostupné iba role service_role.

## Overenie pred aktiváciou

Automatické testy overujú párovanie bez duplikátov, zmenu času oboma smermi, zrušenie bez straty dokumentov, odmietnutie cudzích účtov/pôvodov, mesačné hranice, odosielanie iba po zapnutí a opakovanie požiadaviek bez opakovaných správ. Skutočný prenos možno overiť až po povolení Google účtu: založiť skúšobnú zákazku bez zákazníckych správ, presunúť ju v Google, overiť návrat času a potom ju zrušiť.
