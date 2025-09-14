// src/app/api/organizations/stripe-onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// Create Stripe Connect account and onboarding link
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, refreshUrl, returnUrl } = await req.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const userOrg = await prisma.userOrg.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: { in: ["OWNER", "ORG_ADMIN"] } // Only owners/org admins can set up Stripe
      },
      include: {
        organization: true
      }
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: "Access denied or organization not found" },
        { status: 403 }
      );
    }

    const organization = userOrg.organization;

    // Check if organization already has a Stripe account
    if (organization.stripeAccountId) {
      // If account exists, create onboarding link for existing account
      const accountLink = await stripe.accountLinks.create({
        account: organization.stripeAccountId,
        refresh_url:
          refreshUrl ||
          `${process.env.NEXTAUTH_URL}/settings/payments?refresh=true`,
        return_url:
          returnUrl ||
          `${process.env.NEXTAUTH_URL}/settings/payments?success=true`,
        type: "account_onboarding"
      });

      return NextResponse.json({
        accountId: organization.stripeAccountId,
        onboardingUrl: accountLink.url,
        isExisting: true
      });
    }

    // Create new Stripe Connect account
    const account = await stripe.accounts.create({
      type: "standard",
      country: "US",
      email: session.user.email,
      business_profile: {
        name: organization.name,
        support_email: session.user.email
      },
      metadata: {
        organizationId: organization.id,
        createdBy: session.user.id
      }
    });

    // Update organization with Stripe account ID
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        stripeAccountId: account.id,
        stripeOnboardingComplete: false,
        stripeChargesEnabled: false
      }
    });

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url:
        refreshUrl ||
        `${process.env.NEXTAUTH_URL}/settings/payments?refresh=true`,
      return_url:
        returnUrl ||
        `${process.env.NEXTAUTH_URL}/settings/payments?success=true`,
      type: "account_onboarding"
    });

    return NextResponse.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
      isExisting: false
    });
  } catch (error) {
    console.error("Stripe onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe onboarding" },
      { status: 500 }
    );
  }
}

// Get Stripe Connect account status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const userOrg = await prisma.userOrg.findFirst({
      where: {
        userId: session.user.id,
        organizationId
      },
      include: {
        organization: true
      }
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: "Access denied or organization not found" },
        { status: 403 }
      );
    }

    const organization = userOrg.organization;

    if (!organization.stripeAccountId) {
      return NextResponse.json({
        hasStripeAccount: false,
        onboardingComplete: false,
        chargesEnabled: false
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(
      organization.stripeAccountId
    );

    const onboardingComplete =
      account.details_submitted && !account.requirements?.currently_due?.length;
    const chargesEnabled = account.charges_enabled;

    // Update organization status if changed
    if (
      organization.stripeOnboardingComplete !== onboardingComplete ||
      organization.stripeChargesEnabled !== chargesEnabled
    ) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          stripeOnboardingComplete: onboardingComplete,
          stripeChargesEnabled: chargesEnabled
        }
      });
    }

    return NextResponse.json({
      hasStripeAccount: true,
      accountId: organization.stripeAccountId,
      onboardingComplete,
      chargesEnabled,
      requirementsCurrentlyDue: account.requirements?.currently_due || [],
      requirementsEventuallyDue: account.requirements?.eventually_due || [],
      accountType: account.type,
      country: account.country,
      defaultCurrency: account.default_currency,
      businessProfile: {
        name: account.business_profile?.name,
        url: account.business_profile?.url,
        supportEmail: account.business_profile?.support_email
      }
    });
  } catch (error) {
    console.error("Stripe account status error:", error);
    return NextResponse.json(
      { error: "Failed to get Stripe account status" },
      { status: 500 }
    );
  }
}
