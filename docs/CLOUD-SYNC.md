# Synchronizácia PC – mobil a prílohy

Na oboch zariadeniach otvorte https://spektra-servis.vercel.app, načítajte novú verziu a v Nastaveniach použite rovnaký e-mail a heslo ako v Cenových ponukách. Kliknite Zapnúť synchronizáciu. Na oboch zariadeniach pripojte rovnaký osobný OneDrive účet. Ide o dve samostatné prihlásenia.

Databáza zákaziek, zákazníkov, zariadení, skladu, nastavení a odkazov na prílohy je synchronizovaná cez Supabase. OneDrive obsahuje súbory PDF a fotografie. Existujúce lokálne dáta sa pri prvom spojení zlúčia; pred spojením sa uloží ochranná kópia. Odlišné úpravy polí sa zlúčia automaticky, konflikt rovnakého poľa vyžaduje výber v Nastaveniach. Lokálne zmeny zostávajú uložené pri výpadku siete. Pracovný priestor zariadenia je naviazaný na prvý pripojený účet.

Synchronizácia prebieha po uložení a každých 15 sekúnd pri otvorenej aplikácii, tiež po návrate online. Počas editovania sa odkladá. Kontroluje najprv iba číslo verzie; databázu sťahuje po zmene. Zatvorená aplikácia negarantuje prenosy na pozadí. Demo sa nesynchronizuje.

V module Súbory / OneDrive vyberte zákazku a pridajte PDF alebo fotografie (PDF, JPEG, PNG, WEBP, HEIC/HEIF, max. 100 MB na súbor). Front sa uloží do IndexedDB a opakuje prenos pri otvorenej aplikácii. Každá položka je viazaná na databázový aj Microsoft účet. Opakovaný prenos používa rovnaký jedinečný názov, takže nevytvára duplicitné súbory. Až po potvrdení OneDrive sa uloží odkaz do databázy a odstráni miestny front. Názvy pre používateľa sa uchovávajú v metadátach; fyzické názvy v OneDrive začínajú Priloha-.

Nové PDF návody sa automaticky zaradia po importe, ak sú obe služby pripojené. Staré návody prenesiete tlačidlom v module Súbory. Exportované PDF z Cenových ponúk a RS2 treba do modulu pridať; export týchto aplikácií sa automaticky nezachytáva. Binárne prílohy sa nezahŕňajú do šifrovanej databázovej zálohy.

## Prevádzka a overenie

Migrácia cloud-sync.sql bola aplikovaná v existujúcom projekte Spektra Ponuky. Tabuľka servis_sync má RLS podľa auth.uid a zápis cez kontrolu očakávanej revízie. Ostatné tabuľky Cenových ponúk sa nemenia. Klient používa verejný publishable key, nikdy service-role kľúč.

Automatizované testy overujú zlúčenie, offline zmeny, kolíziu čísel zákaziek, konflikty, odmietnutie starej revízie, súbežné lokálne uloženie, oddelenie účtov, trvalý front, signatúry súborov, obnovenie Microsoft relácie a sťahovanie bez prenášania bearer tokenu na iný host. Na databáze bol rollback testom overený RLS aj CAS zápis. Priamy test na používateľovom PC a mobile nie je možný bez aktivácie prihlásenia na oboch zariadeniach.
