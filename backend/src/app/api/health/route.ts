import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      api: "ok",
      database: "unknown"
    }
  };

  // Check database connection
  try {
    await connectDB();
    health.services.database = "connected";
  } catch (error: any) {
    health.status = "degraded";
    health.services.database = "disconnected";
    health.databaseError = process.env.NODE_ENV === "development" 
      ? error?.message 
      : "Database connection failed";
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}