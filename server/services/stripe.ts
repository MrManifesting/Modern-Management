/**
 * Stripe service for processing payments and affiliate payouts
 */
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required environment variable: STRIPE_SECRET_KEY');
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

/**
 * Create a Stripe customer
 * 
 * @param email Customer email
 * @param name Customer name
 * @param metadata Additional metadata
 * @returns The created Stripe customer
 */
export async function createCustomer(email: string, name: string, metadata: any = {}) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata
    });
    
    return customer;
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    throw error;
  }
}

/**
 * Create a Stripe account for an affiliate
 * 
 * @param email Affiliate email
 * @param name Affiliate name
 * @param metadata Additional metadata
 * @returns The created Stripe connected account
 */
export async function createConnectedAccount(email: string, name: string, metadata: any = {}) {
  try {
    // Create a connected account (for an affiliate)
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      metadata: {
        ...metadata,
        name
      },
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
        us_bank_account_ach_payments: { requested: true }
      },
      business_type: 'individual',
      business_profile: {
        name: `${name} - Affiliate`,
        url: process.env.BASE_URL || 'https://inventorypro.app'
      }
    });
    
    return account;
  } catch (error) {
    console.error("Error creating Stripe connected account:", error);
    throw error;
  }
}

/**
 * Create an account link for onboarding
 * 
 * @param accountId The Stripe account ID
 * @returns An account link for onboarding
 */
export async function createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });
    
    return accountLink;
  } catch (error) {
    console.error("Error creating Stripe account link:", error);
    throw error;
  }
}

/**
 * Create a payout to an affiliate
 * 
 * @param amount The amount to pay out (in dollars)
 * @param accountId The Stripe account ID of the recipient
 * @param metadata Additional metadata
 * @returns The created transfer
 */
export async function createPayout(amount: number, accountId: string, metadata: any = {}) {
  try {
    // Create a transfer to the connected account
    // Amount is in cents, so multiply by 100
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: accountId,
      metadata
    });
    
    return transfer;
  } catch (error) {
    console.error("Error creating Stripe payout:", error);
    throw error;
  }
}

/**
 * Get account details
 * 
 * @param accountId The Stripe account ID
 * @returns The account details
 */
export async function getAccountDetails(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error) {
    console.error("Error retrieving Stripe account:", error);
    throw error;
  }
}

/**
 * Check if an account is fully onboarded and ready to receive payments
 * 
 * @param accountId The Stripe account ID
 * @returns Whether the account is ready to receive payouts
 */
export async function isAccountReadyForPayouts(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    
    // Check if the account is active and charges_enabled is true
    return account.charges_enabled && account.payouts_enabled;
  } catch (error) {
    console.error("Error checking account readiness:", error);
    return false;
  }
}

/**
 * Create a payment for a purchase with affiliate tracking
 * 
 * @param amount The payment amount (in dollars)
 * @param currency The currency code (e.g., 'usd')
 * @param customerEmail Customer email
 * @param metadata Additional metadata for tracking
 * @returns The created payment intent
 */
export async function createPaymentWithAffiliateTracking(
  amount: number, 
  currency: string = 'usd',
  customerEmail: string,
  metadata: any = {}
) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      receipt_email: customerEmail,
      metadata
    });
    
    return paymentIntent;
  } catch (error) {
    console.error("Error creating payment with affiliate tracking:", error);
    throw error;
  }
}

/**
 * Confirm payment and apply affiliate commission
 * 
 * @param paymentIntentId The payment intent ID
 * @param affiliateAccountId The affiliate's Stripe account ID
 * @param commissionRate The commission rate (e.g., 0.04 for 4%)
 * @returns The updated payment intent and transfer for the commission
 */
export async function confirmPaymentAndApplyCommission(
  paymentIntentId: string,
  affiliateAccountId: string,
  commissionRate: number = 0.04
) {
  try {
    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment has not succeeded yet');
    }
    
    // Calculate commission amount (Stripe amounts are in cents)
    const paymentAmount = paymentIntent.amount;
    const commissionAmount = Math.round(paymentAmount * commissionRate);
    
    // Create a transfer to the affiliate
    const transfer = await stripe.transfers.create({
      amount: commissionAmount,
      currency: paymentIntent.currency,
      destination: affiliateAccountId,
      source_transaction: paymentIntent.latest_charge as string,
      metadata: {
        payment_intent_id: paymentIntentId,
        commission_rate: commissionRate.toString(),
        type: 'affiliate_commission'
      }
    });
    
    return { paymentIntent, transfer };
  } catch (error) {
    console.error("Error confirming payment and applying commission:", error);
    throw error;
  }
}

/**
 * Create a login link for a connected account
 * 
 * @param accountId The Stripe account ID
 * @returns A login link for the connected account dashboard
 */
export async function createLoginLink(accountId: string) {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink;
  } catch (error) {
    console.error("Error creating login link:", error);
    throw error;
  }
}

export default {
  createCustomer,
  createConnectedAccount,
  createAccountLink,
  createPayout,
  getAccountDetails,
  isAccountReadyForPayouts,
  createPaymentWithAffiliateTracking,
  confirmPaymentAndApplyCommission,
  createLoginLink
};