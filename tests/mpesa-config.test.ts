import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveMpesaTransaction } from "../src/lib/payments.ts";

describe("M-Pesa STK transaction config", () => {
  it("uses the Paybill shortcode for both parties by default", () => {
    const tx = resolveMpesaTransaction({
      MPESA_SHORTCODE: "7837109",
    });
    assert.equal(tx.transactionType, "CustomerPayBillOnline");
    assert.equal(tx.businessShortCode, "7837109");
    assert.equal(tx.partyB, "7837109");
  });

  it("uses the Till as PartyB and switches to Buy Goods", () => {
    const tx = resolveMpesaTransaction({
      MPESA_SHORTCODE: "7837109",
      MPESA_TILL: "1781595",
    });
    assert.equal(tx.transactionType, "CustomerBuyGoodsOnline");
    assert.equal(tx.businessShortCode, "7837109");
    assert.equal(tx.partyB, "1781595");
  });

  it("honours an explicit transaction type override", () => {
    const tx = resolveMpesaTransaction({
      MPESA_SHORTCODE: "7837109",
      MPESA_TILL: "1781595",
      MPESA_TRANSACTION_TYPE: "CustomerPayBillOnline",
    });
    assert.equal(tx.transactionType, "CustomerPayBillOnline");
    assert.equal(tx.partyB, "1781595");
  });

  it("falls back to the Till when no separate shortcode is set", () => {
    const tx = resolveMpesaTransaction({ MPESA_TILL: " 1781595 " });
    assert.equal(tx.transactionType, "CustomerBuyGoodsOnline");
    assert.equal(tx.businessShortCode, "1781595");
    assert.equal(tx.partyB, "1781595");
  });

  it("returns empty values when M-Pesa is not configured", () => {
    const tx = resolveMpesaTransaction({});
    assert.deepEqual(tx, {
      transactionType: "CustomerPayBillOnline",
      businessShortCode: "",
      partyB: "",
    });
  });
});
