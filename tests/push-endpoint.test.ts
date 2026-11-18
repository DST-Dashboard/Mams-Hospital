import { describe, expect, it } from "vitest";
import { isAllowedPushEndpointUrl } from "@/contracts/auth";
import {
  createPushEndpointAgent,
  PushEndpointRejectedError,
  PushEndpointResolutionError,
} from "@/server/notify/push-endpoint";

describe("push endpoint validation", () => {
  it("allows public HTTPS push-service endpoints and pins DNS to a validated address", async () => {
    const resolve = async (hostname: string) => {
      expect(hostname).toBe("fcm.googleapis.com");
      return [{ address: "142.250.72.74", family: 4 }];
    };
    const agent = await createPushEndpointAgent("https://fcm.googleapis.com/fcm/send/subscription", resolve);
    try {
      const lookup = agent.options.lookup;
      expect(lookup).toBeTypeOf("function");
      const pinned = await new Promise<{ address: string | import("node:dns").LookupAddress[]; family?: number }>((resolveLookup, reject) => {
        lookup?.("fcm.googleapis.com", {}, (error, address, family) => {
          if (error) reject(error);
          else resolveLookup({ address, family });
        });
      });
      expect(pinned).toEqual({ address: "142.250.72.74", family: 4 });
    } finally {
      agent.destroy();
    }
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/subscription",
    "https://localhost/",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://push.example.test/subscription",
    "https://user@fcm.googleapis.com/subscription",
    "https://fcm.googleapis.com:444/subscription",
    "not a URL",
  ])("rejects malformed or non-public-service endpoint %s", (endpoint) => {
    expect(isAllowedPushEndpointUrl(endpoint)).toBe(false);
  });

  it.each([
    { address: "127.0.0.1", family: 4 },
    { address: "10.10.0.3", family: 4 },
    { address: "172.20.1.1", family: 4 },
    { address: "192.168.1.1", family: 4 },
    { address: "169.254.1.1", family: 4 },
    { address: "::1", family: 6 },
    { address: "fc00::1", family: 6 },
    { address: "fe80::1", family: 6 },
    { address: "::ffff:127.0.0.1", family: 6 },
  ])("rejects prohibited DNS result $address", async (answer) => {
    await expect(createPushEndpointAgent(
      "https://fcm.googleapis.com/fcm/send/subscription",
      async () => [answer],
    )).rejects.toBeInstanceOf(PushEndpointRejectedError);
  });

  it("rejects a public/private mixed DNS answer set to prevent resolver rebinding", async () => {
    await expect(createPushEndpointAgent(
      "https://fcm.googleapis.com/fcm/send/subscription",
      async () => [
        { address: "142.250.72.74", family: 4 },
        { address: "10.0.0.8", family: 4 },
      ],
    )).rejects.toBeInstanceOf(PushEndpointRejectedError);
  });

  it("rejects DNS resolution errors and empty results", async () => {
    await expect(createPushEndpointAgent(
      "https://fcm.googleapis.com/fcm/send/subscription",
      async () => [],
    )).rejects.toBeInstanceOf(PushEndpointResolutionError);
    await expect(createPushEndpointAgent(
      "https://fcm.googleapis.com/fcm/send/subscription",
      async () => { throw new Error("DNS unavailable"); },
    )).rejects.toBeInstanceOf(PushEndpointResolutionError);
  });
});
