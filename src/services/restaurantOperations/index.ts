export * from "./reservations";
export * from "./crm";
/** Import catering/events from `./events` (or `eventOps`) to avoid name collisions with reservations/CRM. */
export * as eventOps from "./events";
/** Workflow automation — import from `./automation` or `workflowOps`. */
export * as workflowOps from "./automation";
/** Customer Journey — import from `./journey` or `journeyOps`. */
export * as journeyOps from "./journey";
