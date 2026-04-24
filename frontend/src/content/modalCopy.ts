/**
 * Edit the strings below. Dev: npm start on :3000 (hot reload).
 * Offer titles / SKU text / Message+Other → backend offers.csv (not this file).
 */

export const offerDetailModal = {
  loading: 'Loading…',
  fetchError: 'Failed to load offer details. Please try again.',
  notFound: 'Offer not found',
  closeButton: 'Close',
  closeAria: 'Close',
  lineMetrics: {
    qty: 'Qty (ctns)',
    expoChargeBack: 'Expo charge back',
    discount: 'Discount',
    expoTotalLine: 'Expo total (line)',
  },
  footnoteLead: 'Combined expo totals (all SKUs in this offer):',
  /** Section title for POS copy from backend/pos.csv */
  posSectionTitle: 'Point of sale',
} as const;

export const learnMoreModal = {
  insightsHeading: 'Key Buyer Insights',
  fragranceImageAlt: 'Fragrances',
} as const;

export function learnMoreInsights(_offerId: string, offerGroup: string): string[] {
  return [
    `${offerGroup} offers significant cost savings for high-volume retailers.`,
    'This promotion provides excellent margins to drive profitability.',
    'Ideal for stores with strong customer demand in this category.',
    'Take advantage of limited-time pricing during this expo period.',
  ];
}

export const storeSales = {
  overlayAriaLabel: 'FY25 store sales snapshot',
  dashboard: {
    fetchError: 'Could not load sales data.',
    loading: 'Loading your store sales…',
    noData: 'No matching sales data for this store ID.',
    back: 'Back',
    continue: 'Continue',
    continueToDeals: 'Continue to deals',
    kicker: 'Your store · FY25 sales snapshot',
    hiWord: 'Hi',
    fallbackFirstName: 'there',
    storeIdPrefix: 'Store ID ',
    totalLabel: 'VALUE = TOTAL SALES',
    top10Title: 'Top 10 items (by value)',
    tableColumns: {
      item: 'Item',
      value: 'Value',
      qty: 'Qty',
    },
  },
} as const;
