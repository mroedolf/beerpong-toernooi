# Toernooi delen — Supabase setup

Tournament sharing uses a free [Supabase](https://supabase.com) project as the
shared database. Reads are open (anyone with the link sees the tournament); only
the creator can change scores, enforced server-side by a secret owner token.

## Eenmalige setup

1. Maak een gratis Supabase-project op https://supabase.com (geen creditcard nodig).
2. Open **SQL Editor → New query**, plak de inhoud van [`schema.sql`](./schema.sql)
   en klik **Run**. Dit maakt de tabel `tournaments` + de twee RPC-functies en
   zet row-level security aan.
3. Ga naar **Project Settings → API** en kopieer:
   - **Project URL** (bv. `https://xxxx.supabase.co`)
   - **anon public** key
4. Plak beide in [`src/lib/cloudConfig.js`](../src/lib/cloudConfig.js):

   ```js
   export const SUPABASE_URL = 'https://xxxx.supabase.co'
   export const SUPABASE_ANON_KEY = 'eyJ...'
   ```

5. Commit + push. Zodra dit live staat verschijnt in het Toernooi de knop
   **"Deel dit toernooi"**.

De anon key is veilig om te committen: hij is publiek bedoeld en wordt beschermd
door row-level security plus de owner-token-controle in `update_tournament`.

## Hoe delen werkt

- **Maker** tikt *Deel dit toernooi* → krijgt een link (`#/toernooi?s=<id>`) en
  bewaart lokaal het geheime owner-token. Elke score-wijziging wordt automatisch
  gepusht.
- **Vrienden** openen de link → zien het toernooi live (alleen-lezen, met een
  *Ververs*-knop en auto-refresh). Zonder het owner-token kunnen ze niets
  aanpassen — ook niet door de client te omzeilen, want de database weigert de
  schrijfactie.
