import { describe, expect, it } from "vitest";

import {
  canApplySandboxReconciliation,
  reconciliationEventId,
  type SandboxReconciliationChecks,
} from "./reconciliation-domain";

const validChecks: SandboxReconciliationChecks = {
  testMode: true,
  sessionComplete: true,
  paymentPaid: true,
  sessionMatches: true,
  linkageMatches: true,
  amountMatches: true,
  currencyMatches: true,
  completionEventFound: true,
};

describe("sandbox payment reconciliation", () => {
  it("requires every external payment and linkage check", () => {
    expect(canApplySandboxReconciliation(validChecks)).toBe(true);

    for (const key of Object.keys(validChecks) as Array<keyof SandboxReconciliationChecks>) {
      expect(canApplySandboxReconciliation({ ...validChecks, [key]: false })).toBe(false);
    }
  });

  it("uses a deterministic ledger identity distinct from Stripe delivery", () => {
    expect(reconciliationEventId("evt_123")).toBe("reconcile_evt_123");
  });
});

