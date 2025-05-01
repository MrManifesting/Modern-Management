import React from 'react';
import { SalesForecastingDashboard } from '../components/analytics/forecasting';
import MainLayout from '@/components/layout/main-layout';

export default function ForecastPage() {
  return (
    <MainLayout>
      <SalesForecastingDashboard />
    </MainLayout>
  );
}