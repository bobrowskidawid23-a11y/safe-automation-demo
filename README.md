# Safe Automation Demo

Minimalny przykład automatyzacji zmian w modelu **audit → plan → explicit apply → readback**. Projekt pokazuje mechanizmy, które ograniczają ryzyko masowych i nieodwracalnych zmian.

## Zabezpieczenia

- audyt nie zmienia danych,
- plan ma deterministyczny hash i krótki token potwierdzający,
- zastosowanie planu jest blokowane po wykryciu zmiany danych wejściowych,
- przed zapisem tworzona jest kopia,
- wynik jest ponownie odczytywany i porównywany,
- duplikaty identyfikatorów zatrzymują proces.

Wszystkie dane są syntetyczne. Repozytorium nie zawiera identyfikatorów, konfiguracji ani danych żadnej firmy.

## Uruchomienie

```bash
npm test
npm run audit
node src/cli.js apply data/inventory.json TOKEN_Z_AUDYTU
```

Polecenie `apply` odczytuje zapisany `plan.json`; nie buduje planu ponownie. Po zapisie ponownie odczytuje `output.json`, porównuje hash i dopiero wtedy tworzy zweryfikowany checkpoint.

## Technologie

Node.js, ES Modules, SHA-256, Node.js Test Runner.
