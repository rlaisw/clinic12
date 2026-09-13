'use client';

import React from 'react';
import { BarChart } from '@repo/ui';
import { apiClient } from '@/lib/api';

interface Medication {
  id: string;
  name: string;
  stockStatus: string;
  stockValue: number;
  outOfStockThreshold: number;
  [key: string]: unknown;
}

async function fetchMedications(): Promise<Medication[]> {
  try {
    const response = await apiClient.get('/medications/');
    const raw = response.data as Record<string, unknown>[];
    const data = raw.map((m) => ({
      id: (m.id ?? m.name) as string,
      name: (m.name ?? (m as Record<string, unknown>).generic_name) as string,
      stockStatus: (m.stock_status ?? m.stockStatus) as string,
      stockValue: typeof m.stock_value === 'number' ? m.stock_value : Number((m as Record<string, unknown>).stock_value ?? 0),
      outOfStockThreshold: typeof m.threshold_stock_value === 'number' ? m.threshold_stock_value : Number((m as Record<string, unknown>).threshold_stock_value ?? 0),
    }));
    return data;
  } catch (error) {
    console.error('Error fetching medications:', error);
    throw error;
  }
}

const InventoryBarChart = () => {
  const [meds, setMeds] = React.useState<Medication[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    fetchMedications()
      .then(data => {
        if (isMounted) {
          setMeds(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="p-4">Loading inventory chart...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  const outOfStockMeds = meds.filter(
    med => med.stockStatus === 'Out of Stock' || med.stockValue < med.outOfStockThreshold
  );

  const chartData = outOfStockMeds
    .slice()
    .sort((a, b) => a.stockValue - b.stockValue)
    .map(med => ({
      name: med.name,
      value: med.stockValue,
    }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Out of Stock Medications - Stock Value</h1>
      <p className="mb-4 text-gray-600">
        Showing {chartData.length} out of {meds.length} total medications
      </p>

      {chartData.length === 0 ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          No medications are currently out of stock.
        </div>
      ) : (
        <div className="bg-white p-4 rounded shadow">
          <BarChart data={chartData} color="#ff4444" />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Summary</h3>
          <p>Total Medications: {meds.length}</p>
          <p>Out of Stock: {chartData.length}</p>
          <p>Percentage: {meds.length > 0 ? Math.round((chartData.length / meds.length) * 100) : 0}%</p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Out of Stock Medications</h3>
          <ul className="list-disc list-inside text-sm">
            {chartData.map(med => (
              <li key={med.name}>{med.name}: {med.value} units</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InventoryBarChart;
