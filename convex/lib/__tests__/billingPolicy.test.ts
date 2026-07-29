import { describe, expect, it } from "vitest";
import {
  isStaleBillingEvent,
  shouldIgnoreSandboxBilling,
} from "../billingPolicy";

const ORDERED = new Set(["INITIAL_PURCHASE", "RENEWAL", "EXPIRATION"]);

describe("shouldIgnoreSandboxBilling", () => {
  it("ignores sandbox when ALLOW_SANDBOX_BILLING is off", () => {
    expect(shouldIgnoreSandboxBilling("SANDBOX", false)).toBe(true);
    expect(shouldIgnoreSandboxBilling("sandbox", false)).toBe(true);
  });

  it("grants sandbox when ALLOW_SANDBOX_BILLING is on", () => {
    expect(shouldIgnoreSandboxBilling("SANDBOX", true)).toBe(false);
  });

  it("never ignores production events", () => {
    expect(shouldIgnoreSandboxBilling("PRODUCTION", false)).toBe(false);
    expect(shouldIgnoreSandboxBilling(undefined, false)).toBe(false);
  });
});

describe("isStaleBillingEvent", () => {
  it("drops ordered events older than lastEventAt", () => {
    expect(isStaleBillingEvent(100, 200, ORDERED, "EXPIRATION")).toBe(true);
  });

  it("accepts newer ordered events", () => {
    expect(isStaleBillingEvent(300, 200, ORDERED, "RENEWAL")).toBe(false);
  });

  it("accepts equal timestamps (strict older-only)", () => {
    expect(isStaleBillingEvent(200, 200, ORDERED, "RENEWAL")).toBe(false);
  });

  it("accepts ordered events when no lastEventAt yet", () => {
    expect(isStaleBillingEvent(100, undefined, ORDERED, "INITIAL_PURCHASE")).toBe(
      false
    );
  });

  it("ignores non-ordered event types", () => {
    expect(isStaleBillingEvent(50, 200, ORDERED, "NON_ORDERED")).toBe(false);
  });
});
