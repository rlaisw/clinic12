import { Card } from '../../card';

interface StockAlert {
  type: 'LOW_STOCK' | 'EXPIRING_SOON' | 'OUT_OF_STOCK';
  medication: string;
  dosage: string;
  details: string;
  count: number;
}

interface StockAlertsProps {
  alerts: StockAlert[];
}

export function StockAlerts({ alerts }: StockAlertsProps) {
  const getAlertColor = (type: string) => {
    switch (type) {
      case 'OUT_OF_STOCK': return 'bg-red-500 border-red-600';
      case 'LOW_STOCK': return 'bg-yellow-400 border-yellow-500';
      case 'EXPIRING_SOON': return 'bg-orange-500 border-orange-600';
      default: return 'bg-red-500 border-red-600';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'OUT_OF_STOCK': return '⚠️';
      case 'LOW_STOCK': return '⚠️';
      case 'EXPIRING_SOON': return '⏰';
      default: return '⚠️';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card
        title="Stock Alerts"
        href="/medication/inventory"
      >
        <p className="text-sm opacity-70">No stock alerts at this time.</p>
      </Card>
    );
  }

  return (
    <Card
      title="Stock Alerts"
      href="/medication/inventory"
    >
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg border ${getAlertColor(alert.type)}`}
          >
            <span className="text-xl">{getAlertIcon(alert.type)}</span>
            <div className="flex-1">
              <div className="font-medium text-sm">{alert.medication}</div>
              <div className="text-xs opacity-80">{alert.details}</div>
            </div>
            <div className="bg-white/20 px-2 py-1 rounded text-xs font-medium">
              {alert.count}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}