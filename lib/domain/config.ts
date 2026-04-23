export const scoringConfig = {
  insulationFit: {
    typeWeights: {
      newSingleFamily: 32,
      newMultifamily: 30,
      commercialShell: 28,
      addition: 20,
      remodel: 16,
      envelope: 18,
      irrelevant: -30
    },
    valuationThresholds: [
      { min: 250000, points: 18, label: "Valuation above $250,000" },
      { min: 100000, points: 10, label: "Valuation above $100,000" },
      { min: 50000, points: 6, label: "Valuation above $50,000" }
    ],
    freshnessDays: {
      under7: 18,
      under30: 10,
      under60: 4,
      stale: -12
    },
    momentumThresholds: [
      { minActivePermits: 6, points: 14 },
      { minActivePermits: 3, points: 8 }
    ],
    clusterPoints: 8,
    lowConfidencePenalty: -10,
    staleClosedPenalty: -18
  }
} as const;

export const appConfig = {
  marketName: process.env.DEFAULT_MARKET_NAME ?? "Cedar Rapids Corridor",
  duplicateThreshold: 0.15,
  staleLeadDays: 45
};
