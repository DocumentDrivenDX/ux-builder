/* Preloaded with node --import: every way Node opens a connection throws, and
   is recorded, so a test proves a command makes no network request (US-109-AC4). */

import { createRequire, syncBuiltinESMExports } from "node:module";

const require = createRequire(import.meta.url);
const attempts = [];
const blocked = (what) => function () {
  attempts.push(what);
  process.stderr.write(`NETWORK-BLOCKED ${what}\n`);
  throw new Error(`network blocked: ${what}`);
};
const net = require("node:net"), tls = require("node:tls"), http = require("node:http"), https = require("node:https"), dns = require("node:dns"), dgram = require("node:dgram"), http2 = require("node:http2");
net.connect = net.createConnection = blocked("net.connect");
net.Socket.prototype.connect = blocked("net.Socket#connect");
tls.connect = blocked("tls.connect");
for (const [name, m] of [["http", http], ["https", https]]) { m.request = blocked(`${name}.request`); m.get = blocked(`${name}.get`); }
http2.connect = blocked("http2.connect");
dns.lookup = blocked("dns.lookup");
dns.resolve = blocked("dns.resolve");
dns.promises.lookup = blocked("dns.promises.lookup");
dgram.createSocket = blocked("dgram.createSocket");
globalThis.fetch = blocked("fetch");
globalThis.WebSocket = blocked("WebSocket");
syncBuiltinESMExports();
process.on("exit", () => { if (attempts.length) process.stderr.write(`NETWORK-ATTEMPTS ${attempts.length}\n`); });
