import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from '@/data/repository';

export type BillingAvailability = 'stripe-web' | 'native-store' | 'native-store-unconfigured';
export type BillingOffer = { price: string; period: string; configured: boolean };

export interface BillingService {
  availability: BillingAvailability;
  getOffer(): Promise<BillingOffer>;
  startSubscription(): Promise<void>;
  manageSubscription(): Promise<void>;
  restorePurchases(): Promise<boolean>;
}

const openFunctionUrl = async (
  functionName: 'create-checkout-session' | 'create-customer-portal',
) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const returnUrl = Linking.createURL('/premium');
  const { data, error } = await supabase.functions.invoke(functionName, { body: { returnUrl } });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error || 'Billing did not return a secure checkout URL.');
  await Linking.openURL(data.url);
};

const stripeWebBilling: BillingService = {
  availability: 'stripe-web',
  getOffer: async () => ({ price: '$9.99', period: 'month', configured: true }),
  startSubscription: () => openFunctionUrl('create-checkout-session'),
  manageSubscription: () => openFunctionUrl('create-customer-portal'),
  restorePurchases: async () => false,
};

const revenueCatKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
let revenueCatUserId: string | undefined;

async function nativePurchases() {
  if (!revenueCatKey || !supabase) throw new Error('App Store purchases are not configured yet.');
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Sign in before purchasing Amplified.');
  const { default: Purchases } = await import('react-native-purchases');
  if (!(await Purchases.isConfigured())) {
    Purchases.configure({ apiKey: revenueCatKey, appUserID: user.id });
    revenueCatUserId = user.id;
  } else if (revenueCatUserId !== user.id) {
    await Purchases.logIn(user.id);
    revenueCatUserId = user.id;
  }
  return Purchases;
}

async function syncNativeEntitlement() {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke('sync-revenuecat-entitlement');
  if (error) throw error;
}

const nativeStoreBilling: BillingService = {
  availability: revenueCatKey ? 'native-store' : 'native-store-unconfigured',
  async getOffer() {
    if (!revenueCatKey) return { price: '$9.99', period: 'month', configured: false };
    const Purchases = await nativePurchases();
    const offerings = await Purchases.getOfferings();
    const offer = offerings.current?.monthly || offerings.current?.availablePackages[0];
    if (!offer) throw new Error('Amplified is not available from the App Store right now.');
    return { price: offer.product.priceString, period: 'month', configured: true };
  },
  async startSubscription() {
    const Purchases = await nativePurchases();
    const offerings = await Purchases.getOfferings();
    const offer = offerings.current?.monthly || offerings.current?.availablePackages[0];
    if (!offer) throw new Error('Amplified is not available from the App Store right now.');
    const { customerInfo } = await Purchases.purchasePackage(offer);
    if (!customerInfo.entitlements.active.amplified)
      throw new Error('The purchase completed without an Amplified entitlement.');
    await syncNativeEntitlement();
  },
  async manageSubscription() {
    const Purchases = await nativePurchases();
    const info = await Purchases.getCustomerInfo();
    if (!info.managementURL) throw new Error('No App Store subscription is active.');
    await Linking.openURL(info.managementURL);
  },
  async restorePurchases() {
    const Purchases = await nativePurchases();
    const info = await Purchases.restorePurchases();
    const active = Boolean(info.entitlements.active.amplified);
    if (active) await syncNativeEntitlement();
    return active;
  },
};

export const billingService = Platform.OS === 'web' ? stripeWebBilling : nativeStoreBilling;
