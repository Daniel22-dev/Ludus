LUDUS 1.16.1 - GitHub Actions CI hotfix

Oprava:
- package-lock.json již neodkazuje na interní OpenAI npm mirror.
- Oba workflow používají veřejný registr https://registry.npmjs.org.
- npm ci má vypnuté zbytečné audit/fund požadavky pro rychlejší CI.

Nahrajte obsah této složky do kořene repozitáře a přepište existující soubory.
