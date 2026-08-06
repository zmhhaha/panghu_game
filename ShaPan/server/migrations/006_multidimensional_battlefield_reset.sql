-- The single-score simulation cannot be reconciled with the multidimensional
-- battlefield model. Reset ShaPan campaign data exactly once; shared users stay intact.
create table if not exists shapan.schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from shapan.schema_migrations where id = '006_multidimensional_battlefield_reset') then
    delete from shapan.campaign_instances;
    insert into shapan.schema_migrations (id) values ('006_multidimensional_battlefield_reset');
  end if;
end $$;
