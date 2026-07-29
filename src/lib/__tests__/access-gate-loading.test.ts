import { describe, expect, it } from "vitest";
import { isAccessGateBalancePending } from "../access-gate-loading";

describe("isAccessGateBalancePending", () => {
  it("waits on first balance load", () => {
    expect(isAccessGateBalancePending(true, undefined, false)).toBe(true);
  });

  it("does not remount when balance briefly reloads after first resolve", () => {
    expect(isAccessGateBalancePending(true, undefined, true)).toBe(false);
  });

  it("ignores balance gate when route does not need balance", () => {
    expect(isAccessGateBalancePending(false, undefined, false)).toBe(false);
  });

  it("treats resolved null balance as loaded", () => {
    expect(isAccessGateBalancePending(true, null, true)).toBe(false);
  });
});
