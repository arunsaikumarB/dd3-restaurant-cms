import { clamp } from "./client";
import type { JourneyScores, JourneySignals } from "./types";

export function computeEngagementScores(signals: JourneySignals): JourneyScores {
  const visitScore = clamp(signals.visitCount * 8);
  const loyaltyScore = clamp(signals.loyaltyPoints / 2 + (signals.isVip ? 25 : 0));
  const aiScore = clamp(signals.aiInteractions * 10);
  const reviewScore = clamp(
    signals.positiveReviews * 20 - signals.negativeReviews * 15,
  );
  const engagementScore = clamp(
    visitScore * 0.35 + loyaltyScore * 0.25 + aiScore * 0.2 + reviewScore * 0.2,
  );

  const cancellationRisk = clamp(
    signals.cancelCount * 20 + signals.noShowCount * 25,
  );
  const days = signals.daysSinceLastVisit ?? 0;
  const churnRisk = clamp(
    (days > 30 ? (days - 30) * 0.8 : 0) + cancellationRisk * 0.4,
  );
  const retentionScore = clamp(100 - churnRisk * 0.7 + visitScore * 0.2);
  const relationshipScore = clamp(
    engagementScore * 0.45 +
      retentionScore * 0.25 +
      loyaltyScore * 0.2 +
      (signals.cateringCount > 0 ? 10 : 0),
  );

  return {
    engagementScore,
    visitScore,
    loyaltyScore,
    aiScore,
    reviewScore,
    cancellationRisk,
    churnRisk,
    retentionScore,
    relationshipScore,
  };
}
