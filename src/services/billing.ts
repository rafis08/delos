import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from '@/data/repository';

export type BillingAvailability = 'stripe-web' | 'native-store' | 'native-store-unconfigured';
export type BillingOffer = { price: string; period: string; configured: boolean };
export type BillingPackage = {
  identifier: string;
  productIdentifier: string;
  title: string;
  price: string;
  packageType: string;
};
export type BillingCustomer = {
  appUserId: string;
  isPro: boolean;
  activeSubscriptions: string[];
  managementUrl: string | null;
};

export const REVENUECAT_ENTITLEMENT = 'delos_music_pro';

export interface BillingService {
  availability: BillingAvailability;
  getOffer(): Promise<BillingOffer>;
  getPackages(): Promise<BillingPackage[]>;
  getCustomerInfo(): Promise<BillingCustomer>;
  hasProEntitlement(): Promise<boolean>;
  startSubscription(): Promise<void>;
  purchasePackage(packageIdentifier: 'monthly' | 'yearly' | 'lifetime'): Promise<boolean>;
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
  getPackages: async () => [],
  getCustomerInfo: async () => ({
    appUserId: '',
    isPro: false,
    activeSubscriptions: [],
    managementUrl: null,
  }),
  hasProEntitlement: async () => false,
  startSubscription: () => openFunctionUrl('create-checkout-session'),
  purchasePackage: async () => {
    await openFunctionUrl('create-checkout-session');
    return false;
  },
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

function hasPro(customerInfo: { entitlements: { active: Record<string, unknown> } }) {
  return Boolean(customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT]);
}

function storeConfigurationError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause || '');
  const code =
    typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : '';
  if (
    code === '23' ||
    message.includes('configuration') ||
    message.includes('could be fetched from App Store Connect')
  ) {
    return new Error(
      'Delos Amplified is temporarily unavailable while its App Store plans finish connecting. No purchase was made. Please try again later.',
    );
  }
  return cause instanceof Error ? cause : new Error('The App Store could not be reached.');
}

async function currentCustomer() {
  const Purchases = await nativePurchases();
  const info = await Purchases.getCustomerInfo();
  return {
    appUserId: info.originalAppUserId,
    isPro: hasPro(info),
    activeSubscriptions: info.activeSubscriptions,
    managementUrl: info.managementURL,
  } satisfies BillingCustomer;
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
  async getPackages() {
    const Purchases = await nativePurchases();
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;
    if (!offering)
      throw new Error('Premium plans are unavailable right now. Please try again later.');
    return offering.availablePackages.map((item) => ({
      identifier: item.identifier,
      productIdentifier: item.product.identifier,
      title: item.product.title,
      price: item.product.priceString,
      packageType: item.packageType,
    }));
  },
  getCustomerInfo: currentCustomer,
  async hasProEntitlement() {
    return (await currentCustomer()).isPro;
  },
  async startSubscription() {
    try {
      const Purchases = await nativePurchases();
      const offerings = await Purchases.getOfferings();
      if (!offerings.current?.availablePackages.length) {
        throw new Error('No App Store products are attached to the current offering.');
      }
      const { default: RevenueCatUI, PAYWALL_RESULT } = await import('react-native-purchases-ui');
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT,
        displayCloseButton: true,
      });
      if (result === PAYWALL_RESULT.CANCELLED || result === PAYWALL_RESULT.NOT_PRESENTED) return;
      if (result === PAYWALL_RESULT.ERROR)
        throw new Error('The App Store purchase screen could not be opened. Please try again.');
      if (!(await currentCustomer()).isPro)
        throw new Error('Your purchase is still processing. Use Restore Purchases in a moment.');
      await syncNativeEntitlement();
    } catch (cause) {
      throw storeConfigurationError(cause);
    }
  },
  async purchasePackage(packageIdentifier) {
    const Purchases = await nativePurchases();
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages || [];
    const selected = packages.find(
      (item) =>
        item.identifier === `$rc_${packageIdentifier}` ||
        item.identifier === packageIdentifier ||
        item.product.identifier === packageIdentifier,
    );
    if (!selected) throw new Error(`${packageIdentifier} is not available from the App Store.`);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selected);
      const active = hasPro(customerInfo);
      if (active) await syncNativeEntitlement();
      return active;
    } catch (cause) {
      if (
        typeof cause === 'object' &&
        cause &&
        'userCancelled' in cause &&
        cause.userCancelled === true
      )
        return false;
      throw cause;
    }
  },
  async manageSubscription() {
    await nativePurchases();
    const { default: RevenueCatUI } = await import('react-native-purchases-ui');
    await RevenueCatUI.presentCustomerCenter();
  },
  async restorePurchases() {
    const Purchases = await nativePurchases();
    const info = await Purchases.restorePurchases();
    const active = hasPro(info);
    if (active) await syncNativeEntitlement();
    return active;
  },
};

export const billingService = Platform.OS === 'web' ? stripeWebBilling : nativeStoreBilling;
