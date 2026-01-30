import { useMemo } from 'react';
import type { ServiceEntry } from '../types/nagios';
import './ServiceCheckPanel.css';

interface ServiceCheckPanelProps {
  services: ServiceEntry[];
}

interface StoppedService {
  serviceName: string;
  host: string;
  hostShort: string;
  status: 'CRITICAL' | 'WARNING';
}

export function ServiceCheckPanel({ services }: ServiceCheckPanelProps) {
  const stoppedServices = useMemo(() => {
    const result: StoppedService[] = [];
    const stoppedRegex = /(\w+)=stopped/g;

    // Process only relevant services in a single pass
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      if (service.service !== 'Service Check') continue;
      if (service.status !== 'CRITICAL' && service.status !== 'WARNING') continue;

      const statusInfo = service.statusInfo;
      const hostShort = service.host.includes(' - ')
        ? service.host.substring(service.host.lastIndexOf(' - ') + 3)
        : service.host;

      // Reset regex lastIndex and find all matches
      stoppedRegex.lastIndex = 0;
      let match;
      while ((match = stoppedRegex.exec(statusInfo)) !== null) {
        result.push({
          serviceName: match[1],
          host: service.host,
          hostShort,
          status: service.status as 'CRITICAL' | 'WARNING'
        });
      }
    }

    // Sort: CRITICAL first, then by service name
    result.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'CRITICAL' ? -1 : 1;
      }
      return a.serviceName.localeCompare(b.serviceName);
    });

    return result;
  }, [services]);

  // Group by status
  const criticalServices = stoppedServices.filter(s => s.status === 'CRITICAL');
  const warningServices = stoppedServices.filter(s => s.status === 'WARNING');

  if (stoppedServices.length === 0) {
    return null;
  }

  return (
    <div className="service-check-panel">
      <div className="sc-header">
        <span className="sc-title">Stopped Services</span>
        <span className="sc-count">{stoppedServices.length}</span>
      </div>

      {criticalServices.length > 0 && (
        <div className="sc-section critical">
          <div className="sc-section-header">
            <span className="sc-section-icon">●</span>
            Critical ({criticalServices.length})
          </div>
          <div className="sc-list">
            {criticalServices.map((svc, idx) => (
              <div key={`${svc.host}-${svc.serviceName}-${idx}`} className="sc-item critical">
                <span className="sc-service" title={svc.serviceName}>{svc.serviceName}</span>
                <span className="sc-host" title={svc.host}>{svc.hostShort}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {warningServices.length > 0 && (
        <div className="sc-section warning">
          <div className="sc-section-header">
            <span className="sc-section-icon">●</span>
            Delayed ({warningServices.length})
          </div>
          <div className="sc-list">
            {warningServices.map((svc, idx) => (
              <div key={`${svc.host}-${svc.serviceName}-${idx}`} className="sc-item warning">
                <span className="sc-service" title={svc.serviceName}>{svc.serviceName}</span>
                <span className="sc-host" title={svc.host}>{svc.hostShort}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
