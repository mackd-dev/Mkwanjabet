import { NextRequest, NextResponse } from "next/server";

/**
 * Leon Bet Sync API Route
 * 
 * This route uses Puppeteer to fetch odds from Leon Bet and sync them to the API server.
 * It bypasses Leon Bet's TLS fingerprint validation by using a real browser.
 * 
 * To enable: Set LEONBET_SYNC_ENABLED=true in environment variables
 */

export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4010/api/v1";
const LEONBET_SYNC_ENABLED = process.env.LEONBET_SYNC_ENABLED === "true";

export async function GET() {
  if (!LEONBET_SYNC_ENABLED) {
    return NextResponse.json(
      { error: "Leon Bet sync is disabled. Set LEONBET_SYNC_ENABLED=true to enable." },
      { status: 403 }
    );
  }

  try {
    // Launch Puppeteer to fetch from Leon Bet
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.launch({
      headless: true as const,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
      ],
    });

    const page = await browser.newPage();

    // Navigate to Leon Bet to establish session
    await page.goto("https://leonbet.co.tz/sw-tz/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for the app to fully load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Fetch the headline matches from within the browser context
    const data = await page.evaluate(async () => {
      const url = "/api-2/betline/headline-matches?ctag=sw-TZ&flags=reg,urlv2,orn2,cn,mm2,rrc,cmg&merged=true";
      const response = await fetch(url);
      return await response.json();
    });

    await browser.close();

    // Forward to the NestJS API to sync with database
    const syncResponse = await fetch(`${API_URL}/admin/leonbet-feed/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // In production, you'd pass an admin JWT token here
        Authorization: `Bearer ${process.env.LEONBET_ADMIN_TOKEN || ""}`,
      },
      body: JSON.stringify(data),
    });

    const syncResult = await syncResponse.json().catch(() => ({ error: "Sync failed" }));

    return NextResponse.json({
      success: true,
      leonbetTotal: data.total || 0,
      leonbetLive: data.liveTotal || 0,
      syncResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Leon Bet sync failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Allow manual trigger with POST as well
  return GET();
}
