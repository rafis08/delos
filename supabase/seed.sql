insert into public.instruments(name) values ('Vocals'),('Guitar'),('Drums'),('Bass'),('Keys'),('Saxophone'),('Violin'),('Producer') on conflict do nothing;
insert into public.genres(name) values ('Alternative Rock'),('Indie'),('Punk'),('R&B'),('Neo-soul'),('Jazz'),('Funk'),('Electronic'),('Pop'),('Metal'),('Folk'),('Hip-hop') on conflict do nothing;
-- The app's 20 fictional profiles live in src/data/seed.ts so demo mode works with no services.
-- To seed hosted Auth-linked profiles, create test auth users first, then insert matching users/profile rows.

