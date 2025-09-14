// src/lib/webhooks/account-handlers.ts
import Stripe from "stripe";
import prisma from "@/lib/prisma";

// Account Event Handlers for Stripe Connect
export async function handleAccountUpdated(account: Stripe.Account) {
  const { id: accountId, metadata } = account;
  const organizationId = metadata?.organizationId;

  if (!organizationId) {
    console.warn(
      `Account updated without organizationId metadata: ${accountId}`
    );
    return;
  }

  try {
    // Determine onboarding and charges status
    const onboardingComplete =
      account.details_submitted && !account.requirements?.currently_due?.length;
    const chargesEnabled = account.charges_enabled;

    // Update organization with latest account status
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        stripeOnboardingComplete: onboardingComplete,
        stripeChargesEnabled: chargesEnabled,
        updatedAt: new Date()
      }
    });

    console.log(
      `Account updated for organization ${organizationId}: onboarding=${onboardingComplete}, charges=${chargesEnabled}`
    );

    // TODO: Send notification to organization admins about status change
    if (onboardingComplete && chargesEnabled) {
      // TODO: Send "Stripe setup complete" notification
      console.log(`Stripe setup completed for organization ${organizationId}`);
    }
  } catch (error) {
    console.error("Error handling account update:", error);
  }
}

export async function handleAccountApplicationAuthorized(
  application: Stripe.Application
) {
  const accountId = application.id;
  // Application events don't have metadata, so we need to find the organization by account ID

  try {
    const organization = await prisma.organization.findFirst({
      where: { stripeAccountId: accountId }
    });

    if (!organization) {
      console.warn(
        `Account application authorized for unknown account: ${accountId}`
      );
      return;
    }

    const organizationId = organization.id;

    // Log the authorization event
    console.log(
      `Stripe application authorized for organization ${organizationId}, account ${accountId}`
    );

    // Update organization if needed
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        updatedAt: new Date()
      }
    });

    // TODO: Send notification to organization admins
  } catch (error) {
    console.error("Error handling account application authorization:", error);
  }
}

export async function handleAccountApplicationDeauthorized(
  application: Stripe.Application
) {
  const accountId = application.id;

  try {
    const organization = await prisma.organization.findFirst({
      where: { stripeAccountId: accountId }
    });

    if (!organization) {
      console.warn(
        `Account application deauthorized for unknown account: ${accountId}`
      );
      return;
    }

    const organizationId = organization.id;

    // Update organization to reflect deauthorization
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        stripeOnboardingComplete: false,
        stripeChargesEnabled: false,
        updatedAt: new Date()
      }
    });

    console.log(
      `Stripe application deauthorized for organization ${organizationId}, account ${accountId}`
    );

    // TODO: Send urgent notification to organization admins
    // TODO: Disable payment processing features
  } catch (error) {
    console.error("Error handling account application deauthorization:", error);
  }
}

export async function handleAccountExternalAccountCreated(
  externalAccount: Stripe.ExternalAccount
) {
  // This fires when a bank account or card is added to the Connect account
  const accountId = externalAccount.account as string;

  try {
    // Find organization by Stripe account ID
    const organization = await prisma.organization.findFirst({
      where: { stripeAccountId: accountId }
    });

    if (organization) {
      console.log(
        `External account created for organization ${organization.id}: ${externalAccount.id}`
      );

      // TODO: Log this event for audit purposes
      // TODO: Notify organization admins about new payment method
    }
  } catch (error) {
    console.error("Error handling external account creation:", error);
  }
}

export async function handleAccountExternalAccountUpdated(
  externalAccount: Stripe.ExternalAccount
) {
  const accountId = externalAccount.account as string;

  try {
    const organization = await prisma.organization.findFirst({
      where: { stripeAccountId: accountId }
    });

    if (organization) {
      console.log(
        `External account updated for organization ${organization.id}: ${externalAccount.id}`
      );

      // TODO: Log this event for audit purposes
    }
  } catch (error) {
    console.error("Error handling external account update:", error);
  }
}

export async function handleAccountExternalAccountDeleted(
  externalAccount: Stripe.ExternalAccount
) {
  const accountId = externalAccount.account as string;

  try {
    const organization = await prisma.organization.findFirst({
      where: { stripeAccountId: accountId }
    });

    if (organization) {
      console.log(
        `External account deleted for organization ${organization.id}: ${externalAccount.id}`
      );

      // TODO: Log this event for audit purposes
      // TODO: Notify organization admins about removed payment method
    }
  } catch (error) {
    console.error("Error handling external account deletion:", error);
  }
}

export async function handlePersonCreated(person: Stripe.Person) {
  const accountId = person.account;

  try {
    const organization = await prisma.organization.findFirst({
      where: { stripeAccountId: accountId }
    });

    if (organization) {
      console.log(
        `Person created for organization ${organization.id}: ${person.id}`
      );

      // TODO: Log this event for compliance/audit purposes
    }
  } catch (error) {
    console.error("Error handling person creation:", error);
  }
}

export async function handlePersonUpdated(person: Stripe.Person) {
  const accountId = person.account;

  try {
    const organization = await prisma.organization.findFirst({
      where: { stripeAccountId: accountId }
    });

    if (organization) {
      console.log(
        `Person updated for organization ${organization.id}: ${person.id}`
      );

      // TODO: Log this event for compliance/audit purposes
    }
  } catch (error) {
    console.error("Error handling person update:", error);
  }
}

export async function handlePersonDeleted(person: Stripe.Person) {
  const accountId = person.account;

  try {
    const organization = await prisma.organization.findFirst({
      where: { stripeAccountId: accountId }
    });

    if (organization) {
      console.log(
        `Person deleted for organization ${organization.id}: ${person.id}`
      );

      // TODO: Log this event for compliance/audit purposes
    }
  } catch (error) {
    console.error("Error handling person deletion:", error);
  }
}
