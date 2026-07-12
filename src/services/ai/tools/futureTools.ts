/**
 * Future tool placeholders — interfaces only.
 * Activate by registering implementations in registry.ts when ready.
 */

export interface MenuTool {
  readonly kind: "menu";
  /** @future getMenuItems(locationId, filters?) */
  execute(_locationId: string): Promise<never>;
}

export interface ReservationTool {
  readonly kind: "reservation";
  /** Implemented by restaurantOperations Reservation Engine via orchestrator adapter. */
  execute(_locationId: string): Promise<never>;
}

export interface CategoryTool {
  readonly kind: "category";
  execute(_locationId: string): Promise<never>;
}

export interface OrderTool {
  readonly kind: "order";
  execute(_locationId: string): Promise<never>;
}

export interface PaymentTool {
  readonly kind: "payment";
  execute(_locationId: string): Promise<never>;
}

export interface ChefGaaCartTool {
  readonly kind: "chefgaa-cart";
  execute(_locationId: string): Promise<never>;
}

export type FutureConciergeTool =
  | MenuTool
  | ReservationTool
  | CategoryTool
  | OrderTool
  | PaymentTool
  | ChefGaaCartTool;
