import { NextRequest, NextResponse } from "next/server";
import { fetch as rpcFetch, ProxyAgent } from "undici";
import { SOLANA_RPC_URL } from "@/solana/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const methods = new Set(["getGenesisHash", "getVersion", "getAccountInfo", "getMultipleAccounts", "getProgramAccounts", "getBalance", "getTokenAccountsByOwner", "getTokenAccountBalance", "getSlot", "getBlockTime", "getBlockHeight", "getLatestBlockhash", "getSignatureStatuses", "getTransaction", "simulateTransaction", "sendTransaction", "getFeeForMessage", "getMinimumBalanceForRentExemption", "isBlockhashValid"]);
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const limits = new Map<string, { start: number; count: number }>();

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const now = Date.now();
  if (limits.size > 1000) for (const [key, value] of limits) if (now - value.start > 60_000) limits.delete(key);
  const limit = limits.get(ip);
  if (limit && now - limit.start < 60_000) {
    if (++limit.count > 600) return NextResponse.json({ error: "Please retry shortly" }, { status: 429 });
  } else limits.set(ip, { start: now, count: 1 });
  try {
    const raw = await request.text();
    if (raw.length > 32_000) return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const body = JSON.parse(raw);
    if (body.jsonrpc !== "2.0" || !methods.has(body.method) || (body.params && !Array.isArray(body.params))) {
      return NextResponse.json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32601, message: "Unsupported RPC method" } });
    }
    const endpoint = process.env.SOLANA_RPC_URL || SOLANA_RPC_URL;
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(new URL(endpoint).hostname);
    const upstream = await rpcFetch(endpoint, {
      method: "POST", headers: { "content-type": "application/json" }, body: raw,
      dispatcher: local ? undefined : dispatcher, signal: AbortSignal.timeout(25_000),
    });
    if (!upstream.ok) return NextResponse.json({ jsonrpc: "2.0", id: body.id, error: { code: -32000, message: "Devnet RPC is temporarily unavailable" } });
    return new NextResponse(await upstream.text(), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Unable to query Devnet. Please retry." } });
  }
}
