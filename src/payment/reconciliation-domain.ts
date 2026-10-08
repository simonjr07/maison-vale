export type SandboxReconciliationChecks = {
  testMode: boolean;
  sessionComplete: boolean;
  paymentPaid: boolean;
  sessionMatches: boolean;
  linkageMatches: boolean;
  amountMatches: boolean;
  currencyMatches: boolean;
  completionEventFound: boolean;
};

export function canApplySandboxReconciliation(checks: SandboxReconciliationChecks) {
  return Object.values(checks).every(Boolean);
}

export function reconciliationEventId(stripeEventId: string) {
  return `reconcile_${stripeEventId}`;
}

