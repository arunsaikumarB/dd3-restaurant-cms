import type { ConversationTopic } from "./types";

export function detectConversationTopic(message: string): ConversationTopic {
  const q = message.toLowerCase();
  if (/offer|deal|promo|discount|special/.test(q)) return "offers";
  if (/hour|open|close|timing|buffet/.test(q)) return "hours";
  if (/oak.?tree|plainfield|lawrence|location|direction|where are/.test(q)) return "location";
  if (/phone|call|email|contact|address|parking/.test(q)) return "contact";
  if (/cater|party|event|banquet/.test(q)) return "catering";
  if (/gallery|photo|picture/.test(q)) return "gallery";
  if (/review|testimonial|rating/.test(q)) return "reviews";
  if (/reserve|table|booking/.test(q)) return "reservation";
  if (/order|delivery|pickup|takeout/.test(q)) return "order";
  if (/recommend|suggest|popular|vegetarian|vegan|spicy|what should i eat/.test(q)) return "recommend";
  if (/menu|dish|food|biryani|curry/.test(q)) return "menu";
  return "general";
}
