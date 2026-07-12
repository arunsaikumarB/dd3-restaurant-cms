/**
 * Automatic task creation for kitchen, decor, purchasing, service, etc.
 */

import { insertTask, listTasks, updateTaskStatus } from "./repository";
import type { EventRecord, EventTask } from "./types";

type TaskTemplate = {
  department: string;
  title: string;
  description: string;
  ownerName?: string;
};

function templatesForEvent(event: EventRecord): TaskTemplate[] {
  const base: TaskTemplate[] = [
    {
      department: "manager",
      title: "Confirm event details with customer",
      description: "Validate date, guest count, package, and deposit.",
      ownerName: "Event Manager",
    },
    {
      department: "kitchen",
      title: "Prep event menu",
      description: `Prepare kitchen plan for ${event.guestCount ?? "TBD"} guests.`,
      ownerName: "Head Chef",
    },
    {
      department: "purchasing",
      title: "Procure ingredients & supplies",
      description: "Order ingredients based on confirmed menu.",
      ownerName: "Purchasing",
    },
    {
      department: "service_staff",
      title: "Assign service staff",
      description: "Schedule servers for event day.",
      ownerName: "Floor Lead",
    },
    {
      department: "cleaning",
      title: "Post-event cleaning checklist",
      description: "Reset venue / equipment after event.",
      ownerName: "Housekeeping",
    },
  ];

  if (event.needs?.decorations) {
    base.push({
      department: "decor",
      title: "Set up decorations",
      description: "Theme décor and table setup.",
      ownerName: "Decor Team",
    });
  }
  if (event.serviceMode === "delivery") {
    base.push({
      department: "delivery",
      title: "Schedule catering delivery",
      description: event.venueAddress ?? "Confirm delivery address and window.",
      ownerName: "Delivery Lead",
    });
  }
  if (event.needs?.liveCounter) {
    base.push({
      department: "kitchen",
      title: "Stage live counters",
      description: "Assign chefs for live stations.",
      ownerName: "Head Chef",
    });
  }
  return base;
}

export async function createTasksForEvent(event: EventRecord): Promise<EventTask[]> {
  const existing = await listTasks({ eventId: event.id });
  if (existing.length > 0) return existing;

  const created: EventTask[] = [];
  for (const t of templatesForEvent(event)) {
    const row = await insertTask({
      eventId: event.id,
      locationId: event.locationId,
      department: t.department,
      title: t.title,
      description: t.description,
      ownerName: t.ownerName ?? null,
      dueDate: event.eventDate,
    });
    if (row) created.push(row);
  }
  return created;
}

export async function getTasks(opts: {
  eventId?: string;
  locationId?: string;
  status?: string;
}): Promise<EventTask[]> {
  return listTasks(opts);
}

export async function completeTask(taskId: string): Promise<EventTask | null> {
  return updateTaskStatus(taskId, "done");
}
