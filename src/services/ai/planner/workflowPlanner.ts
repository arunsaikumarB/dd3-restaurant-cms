import type {
  BusinessRuleId,
  CustomerGoal,
  KnowledgeSourceId,
  PlanComplexity,
  PlannedToolId,
  PlannerIntent,
  TaskType,
  WorkflowStep,
} from "./types";
import type { ClarificationPlan } from "./types";

export function planKnowledgeSources(intent: PlannerIntent, goal: CustomerGoal): {
  sources: KnowledgeSourceId[];
  reasons: string[];
} {
  const sources = new Set<KnowledgeSourceId>(["conversation_memory"]);
  const reasons: string[] = ["Always consider recent conversation context"];

  const add = (s: KnowledgeSourceId, reason: string) => {
    sources.add(s);
    reasons.push(reason);
  };

  if (["hours", "contact", "directions", "restaurant_information", "greeting"].includes(intent)) {
    add("cms", "Outlet/CMS holds hours, contact, and brand info");
    add("restaurant_settings", "Restaurant settings for live hours and contact");
  }
  if (["menu_inquiry", "dish_recommendation", "vegetarian", "vegan", "kids_menu"].includes(intent)) {
    add("cms", "CMS menu modules when enabled");
    add("semantic_rag", "Policies/FAQs and menu docs in knowledge base");
  }
  if (intent === "offers") {
    add("offers", "Live offers feed");
    add("cms", "CMS offers module");
  }
  if (intent === "gallery") add("gallery", "Gallery CMS module");
  if (intent === "reviews") add("reviews", "Reviews module / Google reviews");
  if (
    intent === "reservation" ||
    intent === "modify_reservation" ||
    intent === "cancel_reservation" ||
    goal === "book_table"
  ) {
    add("cms", "Reservation page and outlet context");
    add("business_rules", "Reservation limits and house rules");
    add("semantic_rag", "Cancellation and party policies");
  }
  if (intent === "catering" || intent === "party_booking") {
    add("cms", "Catering/parties CMS");
    add("semantic_rag", "Catering packages and party policies");
    add("business_rules", "Minimums and large-party rules");
  }
  if (intent === "complaint" || intent === "feedback") {
    add("cms", "Contact paths");
    add("semantic_rag", "Policies relevant to complaints");
    add("business_rules", "Refund/escalation policies");
  }
  if (intent === "unknown") {
    add("cms", "Fallback CMS context");
    add("semantic_rag", "Broad FAQ retrieval for unknown intents");
  }

  return { sources: [...sources], reasons };
}

export function planTools(intent: PlannerIntent, goal: CustomerGoal): {
  tools: PlannedToolId[];
  reasons: string[];
} {
  const tools: PlannedToolId[] = [];
  const reasons: string[] = [];
  const add = (t: PlannedToolId, reason: string) => {
    if (!tools.includes(t)) {
      tools.push(t);
      reasons.push(reason);
    }
  };

  if (intent.includes("reservation") || goal === "book_table" || goal === "retrieve_reservation") {
    add("reservation", "Reservation workflow required for table booking/lookup");
  }
  if (["menu_inquiry", "dish_recommendation", "vegetarian", "vegan", "kids_menu"].includes(intent)) {
    add("menu", "Menu tool for dish/catalog answers");
  }
  if (intent === "offers") add("offer", "Offer tool for promotions");
  if (intent === "reviews") add("review", "Review tool for ratings");
  if (intent === "directions" || intent === "contact" || intent === "hours") {
    add("location", "Location tool for outlet facts");
    add("hours", "Hours tool for open/close times");
    add("contact", "Contact tool for phone/email");
  }
  if (intent === "catering") add("catering", "Catering inquiry tool");
  if (intent === "gallery") add("gallery", "Gallery tool");
  if (intent === "order_status") add("future", "Order status may require future POS integration");

  return { tools, reasons };
}

export function planBusinessRules(intent: PlannerIntent, message: string): {
  rules: BusinessRuleId[];
  reasons: string[];
} {
  const q = message.toLowerCase();
  const rules: BusinessRuleId[] = [];
  const reasons: string[] = [];
  const add = (r: BusinessRuleId, reason: string) => {
    if (!rules.includes(r)) {
      rules.push(r);
      reasons.push(reason);
    }
  };

  if (/\b(\d{2,}|large party|group of)\b/.test(q) || intent === "party_booking") {
    add("large_party", "Guest count or party language suggests large-party rules");
  }
  if (intent === "hours" || /closed|open now|holiday/.test(q)) {
    add("restaurant_closed", "Hours questions may need closed/holiday rules");
    add("holiday", "Holiday schedule may apply");
  }
  if (intent.includes("reservation")) {
    add("reservation_limits", "Reservations need capacity/limit rules");
  }
  if (intent === "cancel_reservation" || /cancel/.test(q)) {
    add("cancellation_policy", "Cancellation policy should be consulted");
  }
  if (intent === "kids_menu" || /kids|children/.test(q)) {
    add("kids_policy", "Kids policy may apply");
  }
  if (intent === "catering" || intent === "complaint" || /pay|deposit|refund/.test(q)) {
    add("payment_rules", "Payment or deposit rules may apply");
  }
  if (intent === "catering") {
    add("catering_minimums", "Catering minimums should be checked");
  }

  return { rules, reasons };
}

export function detectTaskType(intent: PlannerIntent, complexity: PlanComplexity): TaskType {
  if (complexity === "complex") return "multi_step";
  if (intent.includes("reservation") || intent === "order_status" || intent === "catering") {
    return "transactional";
  }
  if (intent === "dish_recommendation") return "recommendation";
  if (intent === "complaint" || intent === "feedback") return "support";
  if (intent === "directions" || intent === "gallery" || intent === "contact") return "navigational";
  if (intent === "unknown") return "unknown";
  return "informational";
}

export function planWorkflow(input: {
  intent: PlannerIntent;
  goal: CustomerGoal;
  clarification: ClarificationPlan;
  humanEscalation: boolean;
  complexity: PlanComplexity;
}): WorkflowStep[] {
  const steps: WorkflowStep[] = ["acknowledge"];

  if (input.clarification.required) steps.push("collect_information");
  if (input.humanEscalation) {
    steps.push("escalate_human");
    return steps;
  }

  if (["menu_inquiry", "dish_recommendation", "vegetarian", "vegan", "kids_menu", "offers", "hours", "unknown"].includes(input.intent)) {
    steps.push("retrieve_knowledge");
  }
  if (input.intent === "dish_recommendation") steps.push("recommend");
  if (input.intent.includes("reservation") || input.goal === "book_table") {
    steps.push("reservation");
    steps.push("confirmation");
  } else if (input.intent === "catering" || input.intent === "party_booking") {
    steps.push("catering_quote");
    steps.push("confirmation");
  } else if (input.intent === "directions" || input.intent === "gallery" || input.intent === "contact") {
    steps.push("navigate");
  } else {
    steps.push("answer");
  }

  if (input.complexity === "complex" && !steps.includes("collect_information")) {
    steps.splice(1, 0, "collect_information");
  }

  return steps;
}
