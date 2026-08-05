set search_path to shapan, public;

-- The archive exposes one active instance per campaign. Retire older hidden
-- instances before enforcing that invariant at the database boundary.
with ranked as (
  select id,
         row_number() over (
           partition by owner_user_id, campaign_id
           order by created_at desc, id desc
         ) as position
  from shapan.campaign_instances
  where status in ('running', 'paused')
), retired as (
  update shapan.campaign_instances game
  set status = 'finished',
      updated_at = now()
  from ranked
  where game.id = ranked.id
    and ranked.position > 1
  returning game.id
)
update shapan.agent_jobs job
set status = 'failed',
    updated_at = now()
where job.game_id in (select id from retired)
  and job.status in ('queued', 'running');

create unique index if not exists campaign_instances_one_active_idx
  on shapan.campaign_instances (owner_user_id, campaign_id)
  where status in ('running', 'paused');
