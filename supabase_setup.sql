-- Execute este SQL no Supabase: SQL Editor → New query → Cole e clique em Run

create table if not exists config (
  key   text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Permite leitura e escrita sem login (a senha é protegida por hash SHA-256)
alter table config enable row level security;

create policy "allow all" on config
  for all using (true) with check (true);
