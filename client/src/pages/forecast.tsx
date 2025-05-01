import React from 'react';
import { SalesForecastingDashboard } from '../components/analytics/forecasting';
import { AppLayout } from '../components/layout';

export default function ForecastPage() {
  return (
    <AppLayout>
      <SalesForecastingDashboard />
    </AppLayout>
  );
}