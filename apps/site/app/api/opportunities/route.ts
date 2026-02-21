import { NextResponse } from "next/server";
import { getOpportunities } from "@/lib/data";

export async function GET() {
  try {
    const opportunities = await getOpportunities();
    return NextResponse.json(opportunities);
  } catch (error) {
    console.error("[API] Failed to fetch opportunities:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 },
    );
  }
}
