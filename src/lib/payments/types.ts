// src/lib/payments/types.ts
import { Stripe } from "stripe";

/**
 * Payment-related TypeScript interfaces and types for the PMS system
 */

// Basic payment types
export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "refunded";
export type PaymentMethod =
  | "card"
  | "bank_account"
  | "cash"
  | "check"
  | "other";
export type Currency = "USD" | "EUR" | "GBP" | "INR" | "CAD" | "AUD";

// Deposit calculation result
export interface DepositCalculation {
  subtotal: number;
  depositPercentage: number;
  depositAmount: number;
  remainingAmount: number;
  currency: string;
}

// Add-on item for bookings
export interface AddOnItem {
  id?: string;
  name: string;
  amount: number;
  quantity?: number;
  description?: string;
}

// Payment breakdown for detailed calculations
export interface PaymentBreakdown {
  roomRate: number;
  nights: number;
  roomSubtotal: number;
  addOns: AddOnItem[];
  addOnsTotal: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
}

// Complete payment calculation including deposit
export interface PaymentCalculation {
  breakdown: PaymentBreakdown;
  deposit: DepositCalculation;
}

// Payment intent creation request
export interface CreatePaymentIntentRequest {
  reservationId: string;
  amount: number;
  currency?: Currency;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
  description?: string;
  metadata?: Record<string, string>;
}

// Payment intent response
export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
}

// Payment method information
export interface PaymentMethodInfo {
  id: string;
  type: PaymentMethod;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
  createdAt: Date;
}

// Saved payment method for users
export interface SavedPaymentMethod {
  id: string;
  customerId: string;
  stripePaymentMethodId: string;
  type: string;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  isDefault: boolean;
  createdAt: Date;
}

// Payment transaction record
export interface PaymentTransaction {
  id: string;
  reservationId: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  description?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// Refund information
export interface RefundInfo {
  id: string;
  stripeRefundId: string;
  reservationId: string;
  amount: number;
  status: string;
  reason?: string;
  createdAt: Date;
}

// Payment schedule for installments
export interface PaymentScheduleItem {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  description: string;
  status?: "pending" | "paid" | "overdue" | "failed";
  paymentIntentId?: string;
}

// Webhook event data
export interface WebhookEventData {
  id: string;
  stripeEventId: string;
  eventType: string;
  processedAt: Date;
  data: Record<string, unknown>;
}

// Payment form data
export interface PaymentFormData {
  amount: number;
  currency: Currency;
  paymentMethodId?: string;
  savePaymentMethod: boolean;
  billingDetails?: {
    name: string;
    email: string;
    phone?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
}

// Payment processing result
export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  status?: PaymentStatus;
  error?: string;
  requiresAction?: boolean;
  clientSecret?: string;
}

// Stripe Connect account information
export interface StripeConnectAccount {
  id: string;
  organizationId: string;
  stripeAccountId: string;
  isActive: boolean;
  requirementsCurrentlyDue: string[];
  requirementsEventuallyDue: string[];
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Payment analytics data
export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  successRate: number;
  averageTransactionAmount: number;
  refundRate: number;
  currency: string;
  period: {
    start: Date;
    end: Date;
  };
}

// Error types for payment processing
export interface PaymentError {
  code: string;
  message: string;
  type:
    | "card_error"
    | "validation_error"
    | "api_error"
    | "authentication_error"
    | "rate_limit_error";
  param?: string;
  declineCode?: string;
}

// Stripe webhook event types we handle
export type StripeWebhookEventType =
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "payment_intent.canceled"
  | "payment_intent.created"
  | "payment_intent.processing"
  | "payment_intent.requires_action"
  | "payment_intent.amount_capturable_updated"
  | "payment_intent.partially_funded"
  | "charge.succeeded"
  | "charge.failed"
  | "charge.pending"
  | "charge.captured"
  | "charge.updated"
  | "charge.refunded"
  | "account.updated"
  | "account.application.deauthorized"
  | "payment_method.attached"
  | "payment_method.detached";

// Configuration for payment processing
export interface PaymentConfig {
  currency: Currency;
  defaultDepositPercentage: number;
  taxRate: number;
  processingFeePercentage: number;
  minimumPaymentAmount: number;
  maximumPaymentAmount: number;
  allowSavedPaymentMethods: boolean;
  requireBillingAddress: boolean;
}

// Booking payment context
export interface BookingPaymentContext {
  reservationId: string;
  guestName: string;
  checkInDate: Date;
  checkOutDate: Date;
  roomRate: number;
  nights: number;
  addOns: AddOnItem[];
  propertyName?: string;
  organizationId: string;
  propertyId?: string;
}

// Payment status update event
export interface PaymentStatusUpdate {
  reservationId: string;
  paymentIntentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  timestamp: Date;
  error?: PaymentError;
}

// Export utility type for Stripe objects
export type StripePaymentIntent = Stripe.PaymentIntent;
export type StripeCharge = Stripe.Charge;
export type StripePaymentMethod = Stripe.PaymentMethod;
export type StripeAccount = Stripe.Account;
export type StripeEvent = Stripe.Event;
