export function calculatePermitConfidence(input: {
  hasPermitNumber: boolean;
  hasAddress: boolean;
  hasIssueDate: boolean;
  hasBuilder: boolean;
  parsedFromPdf: boolean;
}) {
  let score = 35;
  if (input.hasPermitNumber) score += 20;
  if (input.hasAddress) score += 15;
  if (input.hasIssueDate) score += 10;
  if (input.hasBuilder) score += 15;
  if (input.parsedFromPdf) score -= 10;
  return Math.max(0, Math.min(100, score));
}
