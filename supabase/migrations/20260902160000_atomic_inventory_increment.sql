-- purchase.receive did select-current_stock -> compute -> update per line,
-- sequentially, in a loop. That's an N+1 (one extra round-trip per PO
-- line) AND a lost-update race: two lines referencing the same item_id in
-- one receive batch (or two concurrent receives) can both read the same
-- stale current_stock and overwrite each other's delta instead of adding.
-- A single atomic UPDATE ... SET current_stock = current_stock + delta
-- closes both: no read-your-own-write dependency, and Postgres serializes
-- concurrent UPDATEs to the same row.

create or replace function increment_inventory_stock(p_item_id uuid, p_tenant_id uuid, p_delta numeric)
returns numeric
language sql
security invoker
set search_path = public, pg_temp
as $$
  update inventory_items
  set current_stock = current_stock + p_delta,
      updated_at = now()
  where id = p_item_id and tenant_id = p_tenant_id
  returning current_stock;
$$;
