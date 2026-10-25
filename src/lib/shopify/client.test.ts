import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import {
  verifyShopifyWebhook,
  normalizeShopifyDomain,
} from "./client";

describe("Shopify Integration Client", () => {
  it("normalizes store domain strings", () => {
    expect(normalizeShopifyDomain("my-brand")).toBe("my-brand.myshopify.com");
    expect(normalizeShopifyDomain("https://my-brand.myshopify.com/")).toBe(
      "my-brand.myshopify.com",
    );
    expect(normalizeShopifyDomain("customstore.com")).toBe("customstore.com");
  });

  it("validates authentic Shopify HMAC signatures", () => {
    const secret = "hulk_smash_super_secret_123";
    const body = JSON.stringify({ id: 123456, order_number: 1001 });
    const signature = createHmac("sha256", secret).update(body, "utf8").digest("base64");

    const isValid = verifyShopifyWebhook(body, signature, secret);
    expect(isValid).toBe(true);
  });

  it("rejects forged or altered HMAC signatures", () => {
    const secret = "secret_abc";
    const body = '{"status":"paid"}';
    const fakeSignature = Buffer.from("forged_signature_hash").toString("base64");

    const isValid = verifyShopifyWebhook(body, fakeSignature, secret);
    expect(isValid).toBe(false);
  });
});
