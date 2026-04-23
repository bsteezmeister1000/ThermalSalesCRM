import { scoringConfig } from "@/lib/domain/config";

export async function getScoringSettings() {
  return scoringConfig;
}
