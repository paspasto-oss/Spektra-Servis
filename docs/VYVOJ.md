# Spektra Servis – postupný vývoj

Samostatný projekt pre jedného technika Spektra Install.

## Schválený základ – 18. 10. 2026

Prebraté zo zdrojov paspasto-oss/RS2 PR #8, commit b6980fdbc23d66b02ca0fab77b62dd017a19e9c9, výhradne priečinok spektra-servis/.
Súčasný vzhľad a rozloženie tlačidiel zostávajú východiskom. Hlavné moduly: Prehľad, Zákazky, Kalendár, Zákazníci, Poradňa; doplnkové Nastavenia a zálohy.

## Poradie práce

1. Vyskúšať existujúce rozloženie na mobile a PC a postupne upravovať ovládanie podľa technika.
2. Overiť skutočné IndexedDB, obnovu zálohy a PWA pred ostrými údajmi.
3. Až následne samostatne riešiť cloud a Google Kalendár.

Existujúce moduly sa nevyvíjajú znova. Produkčná RS2, jej archív a PR #7/#8 sa nemenia ani nezlučujú. Tento repozitár nemá produkčné pripojenie ani automatické nasadzovanie. Lokálne testy a ich pôvodné obmedzenia sú popísané v README.md a docs/test-results.json.
