import { lookup as dnsLookup } from "node:dns/promises";
import https from "node:https";
import { BlockList, type LookupFunction } from "node:net";
import { isAllowedPushEndpointUrl } from "@/contracts/auth";

const blockedIpv4Addresses = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) {
  blockedIpv4Addresses.addSubnet(network, prefix, "ipv4");
}
const blockedIpv6Addresses = new BlockList();
for (const [network, prefix] of [
  ["::", 128], ["::1", 128], ["::ffff:0:0", 96], ["64:ff9b::", 96], ["64:ff9b:1::", 48],
  ["100::", 64], ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7],
  ["fe80::", 10], ["ff00::", 8],
] as const) {
  blockedIpv6Addresses.addSubnet(network, prefix, "ipv6");
}

type ResolvedAddress = { address: string; family: number };
type ResolveHost = (hostname: string) => Promise<ResolvedAddress[]>;

const resolveHost: ResolveHost = (hostname) => dnsLookup(hostname, { all: true, verbatim: true });

export class PushEndpointRejectedError extends Error {
  constructor() {
    super("Push endpoint is not an allowed public destination");
    this.name = "PushEndpointRejectedError";
  }
}

export class PushEndpointResolutionError extends Error {
  constructor() {
    super("Push endpoint could not be verified");
    this.name = "PushEndpointResolutionError";
  }
}

function isPublicAddress(address: ResolvedAddress): boolean {
  if (address.family !== 4 && address.family !== 6) return false;
  if (address.family === 6 && address.address.toLowerCase().startsWith("::ffff:")) return false;
  const family = address.family === 4 ? "ipv4" : "ipv6";
  const blockedAddresses = address.family === 4 ? blockedIpv4Addresses : blockedIpv6Addresses;
  return !blockedAddresses.check(address.address, family);
}

export async function createPushEndpointAgent(
  endpoint: string,
  resolve: ResolveHost = resolveHost,
): Promise<https.Agent> {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Push endpoint must be a valid HTTPS URL");
  }
  if (
    !isAllowedPushEndpointUrl(url.toString())
  ) {
    throw new PushEndpointRejectedError();
  }

  let addresses: ResolvedAddress[];
  try {
    addresses = await resolve(url.hostname);
  } catch {
    throw new PushEndpointResolutionError();
  }
  if (addresses.length === 0) throw new PushEndpointResolutionError();
  if (addresses.some((address) => !isPublicAddress(address))) {
    throw new PushEndpointRejectedError();
  }
  const pinnedAddress = addresses[0];
  if (!pinnedAddress) throw new PushEndpointResolutionError();

  const lookup: LookupFunction = (hostname, options, callback) => {
    if (hostname.toLowerCase() !== url.hostname.toLowerCase()) {
      callback(Object.assign(new Error("Unexpected push endpoint hostname"), { code: "ENOTFOUND" }), "", 0);
      return;
    }
    if (options.all) callback(null, [pinnedAddress]);
    else callback(null, pinnedAddress.address, pinnedAddress.family);
  };
  return new https.Agent({ keepAlive: false, lookup });
}
