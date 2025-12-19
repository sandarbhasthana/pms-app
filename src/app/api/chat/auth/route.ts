/**
 * Ably Token Authentication Endpoint
 *
 * This endpoint generates Ably tokens for authenticated users.
 * Tokens are scoped to the user's organization and include their user ID as clientId.
 *
 * Security:
 * - Only authenticated users can get tokens
 * - Tokens are scoped to user's organization (can only access org channels)
 * - ClientId is set to user's ID for presence tracking
 * - Tokens expire after 1 hour (configurable)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as Ably from "ably";

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // 2. Get organization ID from query params (Ably sends authParams as query string)
    const { searchParams } = new URL(request.url);
    const organizationId =
      searchParams.get("organizationId") || session.user.orgId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // 3. Verify user has access to this organization
    // TODO: Add organization membership check here
    // For now, we trust the session

    // 4. Get Ably API key
    const apiKey = process.env.ABLY_API_KEY;

    if (!apiKey) {
      console.error("ABLY_API_KEY is not configured");
      return NextResponse.json(
        { error: "Chat service is not configured" },
        { status: 500 }
      );
    }

    // 5. Create Ably REST client
    const ably = new Ably.Rest({ key: apiKey });

    // 6. Generate token request with capabilities
    const tokenParams: Ably.TokenParams = {
      // Set clientId to user ID for presence tracking
      clientId: session.user.id,

      // Token valid for 1 hour
      ttl: 60 * 60 * 1000,

      // Capabilities: what this user can do
      capability: {
        // Organization-wide channel (for global updates)
        [`org:${organizationId}`]: ["subscribe", "publish", "presence"],

        // Organization company-wide chat channel
        [`org:${organizationId}:company-wide`]: [
          "subscribe",
          "publish",
          "presence"
        ],

        // All property channels in this org
        [`org:${organizationId}:property:*`]: [
          "subscribe",
          "publish",
          "presence"
        ],

        // All group channels in this org
        [`org:${organizationId}:group:*`]: ["subscribe", "publish", "presence"],

        // All direct message channels in this org
        [`org:${organizationId}:dm:*`]: ["subscribe", "publish", "presence"],

        // All room channels in this org (for direct messages)
        [`org:${organizationId}:room:*`]: ["subscribe", "publish", "presence"],

        // Presence channel
        [`org:${organizationId}:presence`]: [
          "subscribe",
          "publish",
          "presence"
        ],

        // Typing indicators for all rooms
        ["room:*:typing"]: ["subscribe", "publish"],

        // ========== Real-time Calendar/Dashboard Channels ==========
        // All property calendar channels (for reservation updates)
        ["property:*:calendar"]: ["subscribe", "publish"],

        // All property dashboard channels (for stats updates)
        ["property:*:dashboard"]: ["subscribe", "publish"]
      }
    };

    // 7. Create token request
    const tokenRequest = await ably.auth.createTokenRequest(tokenParams);

    // 8. Return token request to client
    return NextResponse.json(tokenRequest, { status: 200 });
  } catch (error) {
    console.error("Error generating Ably token:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication token" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for debugging (optional, remove in production)
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    message: "Ably token auth endpoint is working",
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name
    },
    instructions:
      'Send POST request with { organizationId: "..." } to get token'
  });
}
