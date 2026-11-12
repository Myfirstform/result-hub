# Project rules

- Keep spreadsheet row parsing and validation in a pure utility, then validate before persisting so the import rules remain independently testable.
- Perform public student lookups and privileged account administration in server-side Supabase functions so sensitive columns and admin credentials never reach browser queries.