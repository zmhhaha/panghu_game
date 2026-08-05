set search_path to shapan, public;

alter table shapan.orders
  add column if not exists priority text not null default 'normal';

alter table shapan.orders
  add column if not exists delivered_at_minute integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_priority_check'
      and conrelid = 'shapan.orders'::regclass
  ) then
    alter table shapan.orders
      add constraint orders_priority_check check (priority in ('normal', 'urgent'));
  end if;
end $$;

alter table shapan.messages
  add column if not exists external_id text;

create unique index if not exists messages_game_external_id_idx
  on shapan.messages (game_id, external_id)
  where external_id is not null;
