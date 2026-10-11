import React from 'react';
import { WwStore } from '../api';
import { isMetroStore, storeDisplayName } from '../storeFormat';
import CategoryTrendSparkline from './CategoryTrendSparkline';
import './StoreDetailSummary.css';

const PUBLIC = process.env.PUBLIC_URL || '';

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtMoneyOptional(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—';
  return fmtMoney(Number(value));
}

function fmtCountOptional(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('en-AU');
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="ww-store-metric">
      <p className="ww-store-metric-label">{label}</p>
      <p className="ww-store-metric-value">{value}</p>
    </article>
  );
}

function YearPerformanceCard({
  year,
  sales,
  units,
  pentaBins,
}: {
  year: string;
  sales: string;
  units: string;
  pentaBins: string;
}) {
  return (
    <article className="ww-store-year-card">
      <p className="ww-store-year-card-year">{year}</p>
      <div className="ww-store-year-card-row">
        <span className="ww-store-year-card-label">Sales ($)</span>
        <span className="ww-store-year-card-value">{sales}</span>
      </div>
      <div className="ww-store-year-card-row">
        <span className="ww-store-year-card-label">Units</span>
        <span className="ww-store-year-card-value">{units}</span>
      </div>
      <div className="ww-store-year-card-row">
        <span className="ww-store-year-card-label">PentaBins</span>
        <span className="ww-store-year-card-value">{pentaBins}</span>
      </div>
    </article>
  );
}

export function EnergizerPackProductFigures() {
  return (
    <div className="ww-store-detail-product" aria-label="Energizer Max AA and AAA 16pk">
      <figure className="ww-store-detail-product-sku">
        <div className="ww-store-detail-product-figure">
          <img src={`${PUBLIC}/aa.png`} alt="Energizer Max AA 16pk" />
        </div>
        <figcaption className="ww-store-detail-product-caption">AA 16pk</figcaption>
      </figure>
      <figure className="ww-store-detail-product-sku">
        <div className="ww-store-detail-product-figure">
          <img src={`${PUBLIC}/aaa.png`} alt="Energizer Max AAA 16pk" />
        </div>
        <figcaption className="ww-store-detail-product-caption">AAA 16pk</figcaption>
      </figure>
    </div>
  );
}

type Props = {
  store: WwStore;
  showPromoGrid?: boolean;
  showPentaBins?: boolean;
  showCategoryTrend?: boolean;
};

export default function StoreDetailSummary({
  store,
  showPromoGrid = true,
  showPentaBins = false,
  showCategoryTrend = true,
}: Props) {
  const brand = isMetroStore(store) ? 'Woolworths Metro' : 'Woolworths';
  const locationName = storeDisplayName(store);

  return (
    <div className="ww-store-detail">
      <div className="ww-store-detail-top">
        <div className="ww-store-detail-intro">
          <header className="ww-store-detail-hero">
            <h2 className="ww-store-detail-name">{locationName}</h2>
            <p className="ww-store-detail-meta">{brand}</p>
          </header>
          {showPromoGrid ? (
            <p className="ww-store-detail-product-line">
              Energizer Max · AA &amp; AAA 16pk
            </p>
          ) : null}
          {showPentaBins && !showPromoGrid ? (
            <p className="ww-store-detail-product-line">PentaBin</p>
          ) : null}
        </div>

        {showPromoGrid ? <EnergizerPackProductFigures /> : null}
        {showPentaBins && !showPromoGrid ? (
          <div className="ww-store-detail-product ww-store-detail-product--single" aria-label="PentaBin">
            <figure className="ww-store-detail-product-sku">
              <div className="ww-store-detail-product-figure">
                <img src={`${PUBLIC}/penta-top.png`} alt="PentaBin" />
              </div>
              <figcaption className="ww-store-detail-product-caption">PentaBin</figcaption>
            </figure>
          </div>
        ) : null}
      </div>

      {showPromoGrid ? (
        <div className="ww-store-detail-metrics ww-store-detail-metrics--years">
          <YearPerformanceCard
            year="2024"
            sales={fmtMoneyOptional(store.sales_2024)}
            units={fmtCountOptional(store.units_2024)}
            pentaBins={fmtCountOptional(store.penta_bins_2024)}
          />
          <YearPerformanceCard
            year="2025"
            sales={fmtMoneyOptional(store.sales_ytd)}
            units={fmtCountOptional(store.units_2025)}
            pentaBins={fmtCountOptional(store.penta_bins_2025)}
          />
        </div>
      ) : null}

      {showPentaBins ? (
        <>
          <p className="ww-store-detail-section">PentaBins</p>
          <div className="ww-store-detail-metrics ww-store-detail-metrics--three">
            <Metric label="PentaBin 2024" value={fmtCountOptional(store.penta_bins_2024)} />
            <Metric label="PentaBin 2025" value={fmtCountOptional(store.penta_bins_2025)} />
            <Metric label="2026 recommended" value={fmtCountOptional(store.recommended_2026)} />
          </div>
        </>
      ) : null}

      {showCategoryTrend ? (
        <div className="ww-store-detail-trend">
          <CategoryTrendSparkline store={store} />
        </div>
      ) : null}
    </div>
  );
}
