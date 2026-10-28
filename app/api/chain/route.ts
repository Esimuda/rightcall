import { readChain } from "@/lib/chain";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const chain = await readChain();
  return NextResponse.json(chain);
}
