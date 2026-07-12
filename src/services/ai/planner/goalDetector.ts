import type { CustomerGoal, PlannerIntent } from "./types";
import type { IntentAnalysis } from "./intentAnalyzer";

export function detectCustomerGoal(message: string, analysis: IntentAnalysis): CustomerGoal {
  const q = message.toLowerCase();

  if (/\bforgot (my )?reservation|find (my )?reservation|look up (my )?booking\b/.test(q)) {
    return "retrieve_reservation";
  }
  if (analysis.primary === "cancel_reservation") return "cancel_reservation";
  if (analysis.primary === "modify_reservation") return "modify_reservation";
  if (analysis.primary === "reservation") return "book_table";
  if (analysis.primary === "catering") {
    if (/\b(\d{2,}|sixty|fifty|hundred|80|60|50|40|30)\b/.test(q) || /large|big group|corporate/.test(q)) {
      return "large_catering";
    }
    return "party_inquiry";
  }
  if (analysis.primary === "party_booking") return "party_inquiry";
  if (analysis.primary === "dish_recommendation" || /\bspicy|mild|something to eat\b/.test(q)) {
    return "recommend_dish";
  }
  if (analysis.primary === "menu_inquiry" || analysis.primary === "vegetarian" || analysis.primary === "vegan" || analysis.primary === "kids_menu") {
    return "browse_menu";
  }
  if (analysis.primary === "offers") return "find_offers";
  if (analysis.primary === "hours") return "get_hours";
  if (analysis.primary === "directions") return "get_directions";
  if (analysis.primary === "contact") return "contact_restaurant";
  if (analysis.primary === "gallery") return "view_gallery";
  if (analysis.primary === "reviews") return "read_reviews";
  if (analysis.primary === "complaint") return "file_complaint";
  if (analysis.primary === "feedback") return "leave_feedback";
  if (analysis.primary === "order_status") return "check_order";
  if (analysis.primary === "greeting") return "greet";
  if (analysis.primary === "restaurant_information") return "general_info";
  if (analysis.primary === "unknown") return "unclear";
  return mapIntentFallback(analysis.primary);
}

function mapIntentFallback(intent: PlannerIntent): CustomerGoal {
  switch (intent) {
    case "reservation":
      return "book_table";
    case "menu_inquiry":
      return "browse_menu";
    default:
      return "general_info";
  }
}

export function conversationGoalFrom(goal: CustomerGoal, historyLength: number): CustomerGoal {
  if (historyLength > 0 && goal === "greet") return "general_info";
  return goal;
}
