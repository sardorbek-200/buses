const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateRefund } = require("../lib/business");

const now = new Date("2026-11-06T12:00:00Z");

test("refund is 90 percent when departure is more than 24 hours away", () => {
  assert.deepEqual(calculateRefund(100000, new Date(now.getTime() + 24 * 3600000 + 1), now), {
    percent: 90, amount: 90000
  });
});

test("refund is 50 percent at 24 hours and at 3 hours", () => {
  assert.deepEqual(calculateRefund(100001, new Date(now.getTime() + 24 * 3600000), now), {
    percent: 50, amount: 50000
  });
  assert.deepEqual(calculateRefund(100000, new Date(now.getTime() + 3 * 3600000), now), {
    percent: 50, amount: 50000
  });
});

test("refund is zero less than 3 hours before departure", () => {
  assert.deepEqual(calculateRefund(100000, new Date(now.getTime() + 3 * 3600000 - 1), now), {
    percent: 0, amount: 0
  });
});
