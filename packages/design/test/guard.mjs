/* The network guard (SD-006 Command architecture, ADR-036 rule 3): loaded
   before every test and every CLI run in the tests, it makes any network
   use throw, so a test fails if the package reaches for the network.

     node --import ./test/guard.mjs ... */

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

export const NETWORK_BLOCKED = "network use is blocked in @ux-builder/design tests";
const block = (what) => () => { throw new Error(`${NETWORK_BLOCKED}: ${what}`); };

globalThis.fetch = block("fetch");
for (const [mod, name] of [[http, "http"], [https, "https"]]) {
  mod.request = block(`${name}.request`);
  mod.get = block(`${name}.get`);
}
net.connect = block("net.connect");
net.createConnection = block("net.createConnection");
dns.lookup = block("dns.lookup");
dns.resolve = block("dns.resolve");
