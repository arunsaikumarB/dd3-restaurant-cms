import { SYNC_LOCK_TTL_MS } from "../constants";
import { syncLockTable } from "../db";
import { createChefGaaSyncClient } from "../supabaseClient";

type LockRow = {
  locked: boolean;
  expires_at: string | null;
  lock_holder: string | null;
};

export type SyncLockHandle = {
  holder: string;
};

export async function isSyncLocked(): Promise<boolean> {
  const supabase = createChefGaaSyncClient();
  const { data } = await syncLockTable(supabase)
    .select("locked, expires_at, lock_holder")
    .eq("id", 1)
    .maybeSingle();

  const row = data as LockRow | null;
  if (!row?.locked) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    await releaseSyncLock(row.lock_holder ?? undefined);
    return false;
  }
  return true;
}

export async function acquireSyncLock(holder: string): Promise<SyncLockHandle | null> {
  if (await isSyncLocked()) return null;

  const supabase = createChefGaaSyncClient();
  const now = new Date();
  const { error } = await syncLockTable(supabase)
    .update({
      locked: true,
      lock_holder: holder,
      locked_at: now.toISOString(),
      expires_at: new Date(now.getTime() + SYNC_LOCK_TTL_MS).toISOString(),
    })
    .eq("id", 1);

  if (error) return null;

  const { data } = await syncLockTable(supabase)
    .select("lock_holder, locked")
    .eq("id", 1)
    .maybeSingle();

  const row = data as LockRow | null;
  if (!row?.locked || row.lock_holder !== holder) return null;
  return { holder };
}

export async function releaseSyncLock(holder?: string): Promise<void> {
  const supabase = createChefGaaSyncClient();

  if (holder) {
    const { data } = await syncLockTable(supabase)
      .select("lock_holder")
      .eq("id", 1)
      .maybeSingle();
    const row = data as LockRow | null;
    if (row?.lock_holder && row.lock_holder !== holder) return;
  }

  await syncLockTable(supabase)
    .update({
      locked: false,
      lock_holder: null,
      locked_at: null,
      expires_at: null,
    })
    .eq("id", 1);
}
