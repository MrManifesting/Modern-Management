/**
 * Stripe service for managing affiliate payments
 */
import Stripe from "stripe";
import { z } from "zod";

// Initialize Stripe with API key
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not found. Stripe integration will not work.");
}

// Initialize Stripe with API key if available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) 
  : null;

/**
 * Check if Stripe is configured
 */
function isStripeConfigured(): boolean {
  return !!stripe;
}

/**
 * Create a Stripe Connect account for an affiliate
 * 
 * @param email Affiliate email
 * @param name Affiliate name
 * @param metadata Additional metadata
 * @returns The created account
 */
async function createConnectedAccount(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Stripe.Account> {
  if (!stripe) throw new Error("Stripe not configured");

  try {
    // Create a Standard Connect account
    const account = await stripe.accounts.create({
      type: "express",
      email,
      business_type: "individual",
      business_profile: {
        name,
        url: "https://inventorypro.com",
      },
      capabilities: {
        transfers: { requested: true },
      },
      metadata,
    });

    return account;
  } catch (error) {
    console.error("Error creating Stripe account:", error);
    throw error;
  }
}

/**
 * Create an account link for onboarding
 * 
 * @param accountId Stripe account ID
 * @param refreshUrl URL to redirect if onboarding is interrupted
 * @param returnUrl URL to redirect when onboarding is complete
 * @returns Account link
 */
async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  if (!stripe) throw new Error("Stripe not configured");

  try {
    // Create an account link for the user to onboard
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return accountLink;
  } catch (error) {
    console.error("Error creating account link:", error);
    throw error;
  }
}

/**
 * Check if an account is ready for payouts
 * 
 * @param accountId Stripe account ID
 * @returns True if the account is ready for payouts
 */
async function isAccountReadyForPayouts(accountId: string): Promise<boolean> {
  if (!stripe) throw new Error("Stripe not configured");

  try {
    const account = await stripe.accounts.retrieve(accountId);
    
    // Check if the account is fully onboarded
    const isDetailsSubmitted = account.details_submitted;
    const isChargesEnabled = account.charges_enabled;
    const isPayoutsEnabled = account.payouts_enabled;
    
    return isDetailsSubmitted && isChargesEnabled && isPayoutsEnabled;
  } catch (error) {
    console.error("Error checking account status:", error);
    throw error;
  }
}

/**
 * Create a login link for the Stripe Connect dashboard
 * 
 * @param accountId Stripe account ID
 * @returns Login link
 */
async function createLoginLink(accountId: string): Promise<Stripe.LoginLink> {
  if (!stripe) throw new Error("Stripe not configured");

  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink;
  } catch (error) {
    console.error("Error creating login link:", error);
    throw error;
  }
}

/**
 * Create a payout (transfer) to a connected account
 * 
 * @param amount Amount to pay out in dollars
 * @param destinationAccountId Destination Stripe account ID
 * @param metadata Additional metadata
 * @returns Transfer object
 */
async function createPayout(
  amount: number,
  destinationAccountId: string,
  metadata?: Record<string, string>
): Promise<Stripe.Transfer> {
  if (!stripe) throw new Error("Stripe not configured");

  try {
    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);
    
    // Create a transfer to the connected account
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: "usd",
      destination: destinationAccountId,
      metadata,
    });
    
    return transfer;
  } catch (error) {
    console.error("Error creating payout:", error);
    throw error;
  }
}

/**
 * Create a payment with affiliate tracking
 * 
 * @param amount Amount in dollars
 * @param currency Currency code (e.g., "usd")
 * @param customerEmail Customer email
 * @param metadata Additional metadata for affiliate tracking
 * @returns PaymentIntent object
 */
async function createPaymentWithAffiliateTracking(
  amount: number,
  currency: string,
  customerEmail: string,
  metadata?: Record<string, any>
): Promise<Stripe.PaymentIntent> {
  if (!stripe) throw new Error("Stripe not configured");

  try {
    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      receipt_email: customerEmail,
      metadata,
    });
    
    return paymentIntent;
  } catch (error) {
    console.error("Error creating payment with affiliate tracking:", error);
    throw error;
  }
}

/**
 * Confirm a payment and apply a commission to an affiliate
 * Typically called by a webhook after payment confirmation
 * 
 * @param paymentIntentId PaymentIntent ID
 * @param affiliateAccountId Affiliate's Stripe account ID
 * @param commissionRate Commission rate (e.g., 0.04 for 4%)
 * @returns Transfer object for the commission payment
 */
async function confirmPaymentAndApplyCommission(
  paymentIntentId: string,
  affiliateAccountId: string,
  commissionRate: number = 0.04
): Promise<Stripe.Transfer> {
  if (!stripe) throw new Error("Stripe not configured");

  try {
    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Verify the payment was successful
    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment ${paymentIntentId} has not been succeeded. Status: ${paymentIntent.status}`);
    }
    
    // Calculate commission amount
    const amount = paymentIntent.amount;
    const commissionAmount = Math.round(amount * commissionRate);
    
    // Create a transfer to the affiliate
    const transfer = await stripe.transfers.create({
      amount: commissionAmount,
      currency: paymentIntent.currency,
      destination: affiliateAccountId,
      source_transaction: paymentIntent.charges?.data[0]?.id,
      metadata: {
        payment_intent_id: paymentIntentId,
        commission_rate: commissionRate.toString(),
        affiliate_account_id: affiliateAccountId,
        ...paymentIntent.metadata
      },
    });
    
    return transfer;
  } catch (error) {
    console.error("Error confirming payment and applying commission:", error);
    throw error;
  }
}

// Export all functions
export default {
  isStripeConfigured,
  createConnectedAccount,
  createAccountLink,
  isAccountReadyForPayouts,
  createLoginLink,
  createPayout,
  createPaymentWithAffiliateTracking,
  confirmPaymentAndApplyCommission
};