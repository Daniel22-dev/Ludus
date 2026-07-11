# Komentář změn — LUDUS 1.14.3

- Dílna LUDUS používá centrální oprávnění s ID `ludus`.
- Stejnou ochranu při buildu dostává všech 12 přímo hostovaných HTML enginů.
- Aplikační skripty se nespustí před ověřením.
- Přímý odkaz na engine proto neobchází zámek.
- Při exportu hotové hry se ochranná vrstva bezpečně odstraní a původní skripty se obnoví.
- Žákovský HTML soubor nevyžaduje AI Studio, přístupový soubor ani internet.

Testy: build dílny, 12 enginů, manifest, standardní bloky, ochranná vrstva a odstranění ochrany při exportu prošly.

- GitHub Actions používá `npm test` jako povinnou release bránu a po vydání může volitelně vyvolat synchronizaci AI Studia.
