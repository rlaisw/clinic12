import { Card } from '../../card';

interface MedicationCardProps {
  medication: string;
  stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'NORMAL_STOCK' | 'HIGH_STOCK' | 'EXPIRING_SOON';
  dosageLabel: string;
  expiryDate: string;
  stockValue: number;
}

export function MedicationCard({
  medication,
  stockStatus,
  dosageLabel,
  expiryDate,
  stockValue,
}: MedicationCardProps) {
  const getStatusColor = () => {
    switch (stockStatus) {
      case 'OUT_OF_STOCK': return 'bg-red-500';
      case 'LOW_STOCK': return 'bg-yellow-400';
      case 'EXPIRING_SOON': return 'bg-orange-500';
      case 'HIGH_STOCK': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
  };
  const formattedExpiry = new Date(expiryDate).toLocaleDateString();
  return (
    <Card
      title={`${medication} (${dosageLabel})`}
      href={`/medication/${encodeURIComponent(medication)}/details`}
    >
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} title={stockStatus.replace('_', ' ')} />
          <span className="text-sm capitalize">{stockStatus.replace('_', ' ').toLowerCase()}</span>
        </div>
        <div className="text-sm">
          <span className="mr-2">Stock:</span>
          <span className="font-medium">{stockValue}</span>
        </div>
      </div>
      <div className="text-sm">
        <span className="mr-2">Expiry:</span>
        <span>{formattedExpiry}</span>
      </div>
    </Card>
  );
}