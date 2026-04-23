import { LeadStatus, type Permit } from "@prisma/client";

import { scoringConfig } from "@/lib/domain/config";
import { classifyLeadType } from "@/lib/domain/classification";
import type { ScoreBreakdown, ScoreReason } from "@/lib/domain/types";

type ScoreInput = {
  permit: Pick<
    Permit,
    | "permitType"
    | "workClass"
    | "projectDescription"
    | "issueDate"
    | "valuation"
    | "status"
    | "sourceConfidence"
  >;
  builderActivePermitCount: number;
  neighborhoodActivityCount: number;
  leadStatus?: LeadStatus;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreLead(input: ScoreInput): ScoreBreakdown {
  const reasons: ScoreReason[] = [];
  const leadType = classifyLeadType({
    permitType: input.permit.permitType,
    workClass: input.permit.workClass,
    description: input.permit.projectDescription
  });

  let insulationFitScore = 10;
  if (leadType === "new_home") {
    insulationFitScore += scoringConfig.insulationFit.typeWeights.newSingleFamily;
    reasons.push({ label: "New single family permit", weight: 32 });
  } else if (leadType === "multifamily") {
    insulationFitScore += scoringConfig.insulationFit.typeWeights.newMultifamily;
    reasons.push({ label: "Multifamily opportunity", weight: 30 });
  } else if (leadType === "commercial") {
    insulationFitScore += scoringConfig.insulationFit.typeWeights.commercialShell;
    reasons.push({ label: "Commercial shell timing", weight: 28 });
  } else if (leadType === "addition") {
    insulationFitScore += scoringConfig.insulationFit.typeWeights.addition;
    reasons.push({ label: "Addition likely needs insulation work", weight: 20 });
  } else if (leadType === "remodel") {
    insulationFitScore += scoringConfig.insulationFit.typeWeights.remodel;
    reasons.push({ label: "Remodel / alteration fit", weight: 16 });
  } else if (leadType === "retrofit_adjacent") {
    insulationFitScore += scoringConfig.insulationFit.typeWeights.envelope;
    reasons.push({ label: "Exterior envelope adjacency", weight: 18 });
  } else {
    insulationFitScore += scoringConfig.insulationFit.typeWeights.irrelevant;
    reasons.push({ label: "Low insulation trade relevance", weight: -30 });
  }

  let revenuePotentialScore = 20;
  const valuation = Number(input.permit.valuation ?? 0);
  for (const threshold of scoringConfig.insulationFit.valuationThresholds) {
    if (valuation >= threshold.min) {
      revenuePotentialScore += threshold.points;
      reasons.push({ label: threshold.label, weight: threshold.points });
      break;
    }
  }

  let relationshipScore = 15;
  const matchingMomentum = scoringConfig.insulationFit.momentumThresholds.find(
    (threshold) => input.builderActivePermitCount >= threshold.minActivePermits
  );
  if (matchingMomentum) {
    relationshipScore += matchingMomentum.points;
    reasons.push({
      label: `Builder appears on ${input.builderActivePermitCount} active permits`,
      weight: matchingMomentum.points,
      detail: "Recurring organizations compound outreach value."
    });
  }

  if (input.neighborhoodActivityCount >= 3) {
    relationshipScore += scoringConfig.insulationFit.clusterPoints;
    reasons.push({
      label: "Address is in an active subdivision cluster",
      weight: scoringConfig.insulationFit.clusterPoints
    });
  }

  let freshnessScore = 20;
  const issueDate = input.permit.issueDate;
  if (issueDate) {
    const daysOld = Math.floor(
      (Date.now() - issueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysOld <= 7) {
      freshnessScore += scoringConfig.insulationFit.freshnessDays.under7;
      reasons.push({ label: "Freshly issued within 7 days", weight: 18 });
    } else if (daysOld <= 30) {
      freshnessScore += scoringConfig.insulationFit.freshnessDays.under30;
      reasons.push({ label: "Issued in the last 30 days", weight: 10 });
    } else if (daysOld <= 60) {
      freshnessScore += scoringConfig.insulationFit.freshnessDays.under60;
      reasons.push({ label: "Still relatively recent", weight: 4 });
    } else {
      freshnessScore += scoringConfig.insulationFit.freshnessDays.stale;
      reasons.push({ label: "Permit is getting stale", weight: -12 });
    }
  }

  if ((input.permit.sourceConfidence ?? 0) < 50) {
    insulationFitScore += scoringConfig.insulationFit.lowConfidencePenalty;
    reasons.push({ label: "Source confidence is low", weight: -10 });
  }

  if (
    input.permit.status?.toLowerCase().includes("closed") ||
    input.leadStatus === LeadStatus.archived
  ) {
    freshnessScore += scoringConfig.insulationFit.staleClosedPenalty;
    reasons.push({ label: "Permit appears closed or stale", weight: -18 });
  }

  insulationFitScore = clamp(insulationFitScore);
  revenuePotentialScore = clamp(revenuePotentialScore);
  relationshipScore = clamp(relationshipScore);
  freshnessScore = clamp(freshnessScore);

  const overallScore = clamp(
    (insulationFitScore +
      revenuePotentialScore +
      relationshipScore +
      freshnessScore) /
      2
  );

  const recommendedAction =
    overallScore >= 80
      ? "Call builder / GC this week and look for estimator handoff."
      : overallScore >= 60
        ? "Review details, confirm builder, and queue outreach."
        : overallScore >= 40
          ? "Keep monitored and enrich organization / parcel context."
          : "Suppress or defer unless relationship context improves.";

  return {
    leadType,
    insulationFitScore,
    revenuePotentialScore,
    relationshipScore,
    freshnessScore,
    overallScore,
    recommendedAction,
    reasons
  };
}
