import { NextRequest, NextResponse } from "next/server";
import { MandateSchema } from "@/contracts/mandate.js";
import { getMandate, saveMandate } from "@/lib/db/mandate-repo.js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "mandate_demo_01";
  const mandate = getMandate(id);

  if (!mandate) {
    return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
  }

  return NextResponse.json(mandate);
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = MandateSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid mandate payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const saved = saveMandate(parsed.data);
    return NextResponse.json(saved);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

