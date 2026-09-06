# LUDUS 1.16.20 – Platform 1.1.2 Studio manifest alignment

Patch pro koordinovanou GHRAB Platform 1.1.2 release wave.

- `studio/app-manifest.template.json` nyní deklaruje Platformu 1.1.2 a rozsah `>=1.1.2 <2.0.0`, stejně jako skutečný consumer/runtime.
- Cache v šabloně je verzována přes `__APP_VERSION__`.
- Source-repository fallback AI Studia tak nemůže LUDUS ověřit se zastaralou deklarací Platformy 1.0.0.
- Suite-session cleanup, PC-01 storage ownership a AI Core integrace se funkčně nemění.
- Kandidát zůstává neprodukční do společného ověření celé release wave.
