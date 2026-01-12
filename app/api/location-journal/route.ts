import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchLocationJournalData } from "@/lib/graph";
import { LocationJournalResponse } from "@/lib/types";

// Simple in-memory cache
let cachedData: { jobs: any[]; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in.", jobs: [], count: 0, timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }

    // Check cache
    const now = Date.now();
    if (cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        jobs: cachedData.jobs,
        count: cachedData.jobs.length,
        timestamp: new Date(cachedData.timestamp).toISOString(),
        cached: true,
      } as LocationJournalResponse);
    }

    // Fetch fresh data from Microsoft Graph
    const jobs = await fetchLocationJournalData(session.accessToken);

    // Update cache
    cachedData = { jobs, timestamp: now };

    return NextResponse.json({
      jobs,
      count: jobs.length,
      timestamp: new Date().toISOString(),
      cached: false,
    } as LocationJournalResponse);

  } catch (error) {
    console.error("Error in location-journal API:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: errorMessage,
        jobs: [],
        count: 0,
        timestamp: new Date().toISOString(),
      } as LocationJournalResponse,
      { status: 500 }
    );
  }
}
