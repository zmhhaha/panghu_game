set search_path to shapan, public;

alter table shapan.campaign_instances
  add column if not exists time_scale smallint not null default 1;

alter table shapan.campaign_instances
  add column if not exists started_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'campaign_instances_time_scale_check'
      and conrelid = 'shapan.campaign_instances'::regclass
  ) then
    alter table shapan.campaign_instances
      add constraint campaign_instances_time_scale_check check (time_scale in (1, 2, 4));
  end if;
end $$;

update shapan.campaign_instances
set started_at = coalesce(started_at, created_at)
where status <> 'paused' and started_at is null;
