insert into public.genres(name) values
  ('Rock'), ('Classic Rock'), ('Indie Pop'), ('Shoegaze'), ('Emo'),
  ('Hardcore'), ('Soul'), ('Blues'), ('Gospel'), ('House'), ('Techno'),
  ('Ambient'), ('Americana'), ('Country'), ('Bluegrass'), ('Rap'),
  ('Reggae'), ('Latin'), ('Afrobeats'), ('Classical'), ('Experimental')
on conflict do nothing;
