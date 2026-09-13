import { MedicationCard } from './Card';
import { StockAlerts } from './StockAlerts';

interface MedicationInventoryProps {
  medications: Array<{
    id: string;
    name: string;
    dosageLabel: string;
    expiryDate: string;
    stockValue: number;
    stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'NORMAL_STOCK' | 'HIGH_STOCK' | 'EXPIRING_SOON';
    lowStockThreshold?: number;
    outOfStockThreshold?: number;
  }>;
}

function computeAlerts(medications: MedicationInventoryProps['medications']) {
  const lowStock: Array<{ medication: string; dosage: string; count: number }> = [];
  const expiringSoon: Array<{ medication: string; dosage: string; expiryDate: string; count: number }> = [];
  const outOfStock: Array<{ medication: string; dosage: string; count: number }> = [];

  medications.forEach((med) => {
    const outThreshold = med.outOfStockThreshold ?? 0;
    const lowThreshold = med.lowStockThreshold ?? 0;

    if (med.stockValue <= outThreshold) {
      outOfStock.push({
        medication: med.name,
        dosage: med.dosageLabel,
        count: med.stockValue
      });
    } else if (med.stockValue <= lowThreshold) {
      lowStock.push({
        medication: med.name,
        dosage: med.dosageLabel,
        count: med.stockValue
      });
    }

    // Check expiry within 30 days
    const daysUntilExpiry = Math.ceil(
      (new Date(med.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      expiringSoon.push({
        medication: med.name,
        dosage: med.dosageLabel,
        expiryDate: med.expiryDate,
        count: med.stockValue
      });
    }
  });

  return { lowStock, expiringSoon, outOfStock };
}

export function MedicationDashboard({ medications }: MedicationInventoryProps) {
  const alerts = computeAlerts(medications);
  // Flatten alerts for StockAlerts component
  const allAlerts = [
    ...alerts.outOfStock.map(item => ({
      type: 'OUT_OF_STOCK' as const,
      medication: item.medication,
      dosage: item.dosage,
      details: 'No stock available',
      count: item.count
    })),
    ...alerts.lowStock.map(item => ({
      type: 'LOW_STOCK' as const,
      medication: item.medication,
      dosage: item.dosage,
      details: `Stock below minimum level (threshold: ${medications.find(m => m.name === item.medication)?.lowStockThreshold ?? 0})`,
      count: item.count
    })),
    ...alerts.expiringSoon.map(item => ({
      type: 'EXPIRING_SOON' as const,
      medication: item.medication,
      dosage: item.dosage,
      details: `Expires on ${new Date(item.expiryDate).toLocaleDateString()}`,
      count: item.count
    }))
  ];

  return (
    <div className="space-y-6">
      <StockAlerts alerts={allAlerts} />
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {medications.map((med) => (
          <MedicationCard
            key={med.id}
            medication={med.name}
            dosageLabel={med.dosageLabel}
            expiryDate={med.expiryDate}
            stockValue={med.stockValue}
            stockStatus={med.stockStatus}
          />
        ))}
      </div>
    </div>
  );
}