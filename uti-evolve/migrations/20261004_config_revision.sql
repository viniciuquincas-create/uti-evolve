-- Gives each config write a server-side revision for conditional updates.
create or replace function public.uti_config_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
 new.updated_at := clock_timestamp();
 return new;
end;
$$;
drop trigger if exists uti_config_revision on public.config;
create trigger uti_config_revision before update on public.config
for each row execute function public.uti_config_revision();
