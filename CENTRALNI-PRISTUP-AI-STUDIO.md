# Centrální přístup AI Studio GHRAB — LUDUS 1.14.3

Dílna LUDUS a všechny přímo dostupné stránky v `dist/engines/` jsou při buildu chráněny oprávněním `ludus`. Jejich aplikační skripty jsou inertní, dokud AI Studio kryptograficky neověří podepsaný přístup.

Správce aktivuje přístup pouze jednou v AI Studiu. Role `admin` otevře LUDUS automaticky; proškolenému učiteli se LUDUS otevře jen tehdy, pokud jeho permit obsahuje aplikaci `ludus`.

Stažené hry pro žáky ochranu neobsahují. Dílna při exportu z nasazeného enginu odstraní přístupový bootstrap a obnoví běžné skripty. Žák proto může výsledný HTML soubor používat offline bez přihlášení.
