import type { ChefGaaSyncClient } from "./supabaseClient";

type SupabaseError = { message: string };

type SelectEqChain<T> = {
  eq(column: string, value: string): SelectEqChain<T> & Promise<{ data: T | null; error: SupabaseError | null }>;
  not(column: string, operator: string, value: string): Promise<{ data: T | null; error: SupabaseError | null }>;
};

type CategoriesSyncQuery = {
  select(columns: string): SelectEqChain<Record<string, unknown>[]>;
  insert(row: Record<string, unknown>): Promise<{ error: SupabaseError | null }>;
  update(row: Record<string, unknown>): {
    eq(column: string, value: string): Promise<{ error: SupabaseError | null }>;
  };
};

type ItemsSyncQuery = {
  select(columns: string): SelectEqChain<Record<string, unknown>[]>;
  insert(row: Record<string, unknown>): Promise<{ error: SupabaseError | null }>;
  update(row: Record<string, unknown>): {
    eq(column: string, value: string): Promise<{ error: SupabaseError | null }>;
  };
};

type ConfigQuery = {
  select(columns: string): {
    eq(column: string, value: string | number): {
      maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: SupabaseError | null }>;
    };
  };
  update(row: Record<string, unknown>): {
    eq(column: string, value: string | number): Promise<{ error: SupabaseError | null }>;
  };
};

type SyncRunsQuery = {
  insert(row: Record<string, unknown>): {
    select(columns: string): {
      single(): Promise<{ data: { id: string } | null; error: SupabaseError | null }>;
    };
  };
  update(row: Record<string, unknown>): {
    eq(column: string, value: string): Promise<{ error: SupabaseError | null }>;
  };
};

type SyncEventsQuery = {
  insert(row: Record<string, unknown>): Promise<{ error: SupabaseError | null }>;
};

type LooseInsert = {
  insert(row: Record<string, unknown>): Promise<{ error: SupabaseError | null; data?: Record<string, unknown> | null }>;
};

type LooseUpdate = {
  update(row: Record<string, unknown>): {
    eq(column: string, value: string | number): {
      select?(columns: string): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: SupabaseError | null }>;
      };
    } & Promise<{ error: SupabaseError | null; data?: Record<string, unknown> | null }>;
  };
};

type LooseSelect = {
  select(columns: string): {
    eq(column: string, value: string | number): {
      maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: SupabaseError | null }>;
      single(): Promise<{ data: Record<string, unknown> | null; error: SupabaseError | null }>;
    };
    order(column: string, options: { ascending: boolean }): {
      limit(n: number): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: SupabaseError | null }>;
      };
    };
  };
};

export function categoriesTable(client: ChefGaaSyncClient) {
  return client.from("menu_categories") as unknown as CategoriesSyncQuery;
}

export function menuItemsTable(client: ChefGaaSyncClient) {
  return client.from("menu_items") as unknown as ItemsSyncQuery;
}

export function locationConfigTable(client: ChefGaaSyncClient) {
  return client.from("chefgaa_location_config") as unknown as ConfigQuery;
}

export function syncRunsTable(client: ChefGaaSyncClient) {
  return client.from("chefgaa_sync_runs") as unknown as SyncRunsQuery;
}

export function syncEventsTable(client: ChefGaaSyncClient) {
  return client.from("chefgaa_sync_run_events") as unknown as SyncEventsQuery;
}

export function syncLockTable(client: ChefGaaSyncClient) {
  return client.from("chefgaa_sync_lock") as unknown as LooseSelect & LooseUpdate;
}

export function syncQueueTable(client: ChefGaaSyncClient) {
  return client.from("chefgaa_sync_queue") as unknown as LooseUpdate & {
    insert(row: Record<string, unknown>): {
      select(columns: string): {
        single(): Promise<{ data: Record<string, unknown> | null; error: SupabaseError | null }>;
      };
    };
    select(columns: string): {
      eq(column: string, value: string): {
        order(column: string, options: { ascending: boolean }): {
          limit(n: number): {
            maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: SupabaseError | null }>;
          };
        };
      };
    };
  };
}

export function syncNotificationsTable(client: ChefGaaSyncClient) {
  return client.from("chefgaa_sync_notifications") as unknown as LooseInsert;
}

export function apiHealthTable(client: ChefGaaSyncClient) {
  return client.from("chefgaa_api_health_checks") as unknown as LooseInsert;
}

export function locationConfigAutomationTable(client: ChefGaaSyncClient) {
  return client.from("chefgaa_location_config") as unknown as LooseSelect & LooseUpdate;
}
