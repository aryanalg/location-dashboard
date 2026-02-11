import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { fetchLocationJournalData } from "@/lib/graph";
import { LocationJournalResponse, Job } from "@/lib/types";
import { apiRateLimiter } from "@/lib/rate-limit";

// Cache with proper typing
interface CacheEntry {
  jobs: Job[];
  timestamp: number;
}

let cachedData: CacheEntry | null = null;
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET(request: NextRequest) {
  try {
    // Get user identifier for rate limiting (use IP as fallback)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0] || "unknown";

    // Get token to extract user email for rate limiting key
    const token = await getToken({ req: request });
    const rateLimitKey = token?.email || ip;

    // Check rate limit
    const rateLimitResult = await apiRateLimiter.check(rateLimitKey);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please wait before trying again.",
          jobs: [],
          count: 0,
          timestamp: new Date().toISOString(),
        } as LocationJournalResponse,
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateLimitResult.resetIn / 1000)),
            "Retry-After": String(Math.ceil(rateLimitResult.resetIn / 1000)),
          },
        }
      );
    }

    // Check authentication - get token directly from JWT (server-side only)
    if (!token) {
      return NextResponse.json(
        {
          error: "Unauthorized. Please sign in.",
          jobs: [],
          count: 0,
          timestamp: new Date().toISOString(),
        } as LocationJournalResponse,
        { status: 401 }
      );
    }

    // Check for token errors (refresh failed)
    if (token.error) {
      const errorMessage =
        token.error === "RefreshTokenError"
          ? "Session expired. Please sign in again."
          : "Authentication error. Please sign in again.";

      return NextResponse.json(
        {
          error: errorMessage,
          jobs: [],
          count: 0,
          timestamp: new Date().toISOString(),
        } as LocationJournalResponse,
        { status: 401 }
      );
    }

    // Get access token from JWT (never exposed to client)
    const accessToken = token.accessToken as string;
    if (!accessToken) {
      return NextResponse.json(
        {
          error: "No access token available. Please sign in again.",
          jobs: [],
          count: 0,
          timestamp: new Date().toISOString(),
        } as LocationJournalResponse,
        { status: 401 }
      );
    }

    // Check cache
    const now = Date.now();
    if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json(
        {
          jobs: cachedData.jobs,
          count: cachedData.jobs.length,
          timestamp: new Date(cachedData.timestamp).toISOString(),
          cached: true,
        } as LocationJournalResponse,
        {
          headers: {
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        }
      );
    }

    // Fetch fresh data from Microsoft Graph
    const jobs = await fetchLocationJournalData(accessToken);

    // Update cache
    cachedData = { jobs, timestamp: now };

    return NextResponse.json(
      {
        jobs,
        count: jobs.length,
        timestamp: new Date().toISOString(),
        cached: false,
      } as LocationJournalResponse,
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      }
    );
  } catch (error) {
    // Log error server-side but don't expose details to client
    console.error("Error in location-journal API:", error);

    // Check for specific Graph API errors
    const errorMessage =
      error instanceof Error
        ? sanitizeErrorMessage(error.message)
        : "An unexpected error occurred. Please try again.";

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

// Sanitize error messages to avoid leaking sensitive information
function sanitizeErrorMessage(message: string): string {
  // List of safe error messages to pass through
  const safePatterns = [
    /Drive ".*" not found/,
    /SharePoint configuration missing/,
    /SharePoint site could not be resolved/,
    /Requested site could not be found/,
    /File not found/,
    /Sheet .* not found/,
  ];

  for (const pattern of safePatterns) {
    if (pattern.test(message)) {
      return message;
    }
  }

  // Check for common Graph API errors
  if (message.includes("InvalidAuthenticationToken")) {
    return "Session expired. Please sign in again.";
  }

  if (message.includes("AccessDenied")) {
    return "Access denied. Please check your permissions.";
  }

  // Generic error for anything else
  return "An error occurred while fetching data. Please try again.";
}
