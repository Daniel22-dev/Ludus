# LUDUS — provozní nasazení ve škole

## Účel a stav

LUDUS 1.16.0 je dílna výukových her určená pro **řízený interní pilot**. Převádí učivo do herních forem a vytváří samostatné HTML výstupy bez žákovských účtů. Pilotní stav se vztahuje k celé dílně; každý engine má navíc vlastní stav `ready`, `draft` nebo `planned`.

## Povinná pravidla

1. Učitel pracuje pouze s anonymizovaným obsahem. Nevkládá jména žáků, individuální hodnocení ani citlivé údaje.
2. LUDUS se používá pro výuku, procvičování a formativní práci. **Není určen pro zabezpečené klasifikované testování.**
3. Učitelský režim `?teacher=1` a správné odpovědi nelze ve statickém HTML považovat za tajné.
4. Veřejné sdílení je dovoleno jen pro obsah, grafiku a branding, k nimž existuje právo zveřejnění.
5. Hratelný export je dostupný pouze u enginů s `builderCompatible: true`.
6. Engine musí přesně odpovídat zvolené dvojici světa a mechaniky. Tichá náhrada jinou mechanikou není dovolena.
7. Engine smí dostat stav `ready` až po splnění `ENGINE_RELEASE_CHECKLIST.md`.
8. Před každou hodinou učitel provede krátký smoke test na zařízení a v prohlížeči, které skutečně použije.

## PWA, síť a offline výuka

Instalovatelná PWA usnadňuje spouštění dílny, ale vstup ověřuje centrální přístupová brána AI Studia. Otevření chráněné dílny proto vyžaduje síťové ověření.

Vyexportované hry jsou samostatné HTML soubory a fungují offline. Pro hodinu bez jistého internetu je nutné hru připravit a uložit předem.

## API klíč

Na sdíleném školním počítači se klíč ukládá pouze pro aktuální relaci. Trvalé uložení je dovoleno jen na osobním důvěryhodném zařízení. Cílovým řešením je školní proxy, aby klíč nemusel být v prohlížeči; její nasazení je samostatný infrastrukturní úkol.

## Vydávání verzí

- změny jdou přes zdrojové soubory, nikoli ruční úpravu `dist/`,
- `dist/` se v repozitáři neuchovává a vzniká až během buildu,
- každé vydání musí projít `npm ci` a `npm test`,
- GitHub Actions musí mít zelený check **Validate LUDUS** a zelený test před deployem,
- na větvi `main` se doporučuje zapnout branch protection,
- změny se zapisují pouze do `CHANGELOG.md`,
- média musí být evidována v `docs/MEDIA_PROVENANCE.md`.

## Odpovědnost učitele

AI výstup ani herní engine nenahrazuje odbornou kontrolu. Učitel před použitím ověří správné odpovědi, jazykovou přesnost, přiměřenost věku, časovou náročnost, funkčnost ovládání a to, že žákům není při projekci zobrazen učitelský panel.
