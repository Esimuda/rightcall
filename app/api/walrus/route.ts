import { walrusStatus } from "@/lib/walrus";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await walrusStatus());
}
