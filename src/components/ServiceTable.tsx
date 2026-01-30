import { useState, useMemo, Fragment } from 'react';
import type { ServiceEntry, ServiceStatus } from '../types/nagios';
import { forceHostServicesCheck } from '../utils/nagiosApi';
import './ServiceTable.css';

interface ServiceTableProps {
  services: ServiceEntry[];
}

type FilterType = 'ALL' | ServiceStatus;
type SortField = 'host' | 'service' | 'status' | 'lastCheck' | 'duration' | 'statusInfo';
type SortDirection = 'asc' | 'desc';

interface GroupedHost {
  host: string;
  hostTitle: string;
  hostParam: string;
  services: ServiceEntry[];
  worstStatus: ServiceStatus;
}

export function ServiceTable({ services }: ServiceTableProps) {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');
  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());
  const [refreshingHosts, setRefreshingHosts] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const statusOrder: Record<ServiceStatus, number> = {
    CRITICAL: 4,
    WARNING: 3,
    UNKNOWN: 2,
    PENDING: 1,
    OK: 0,
  };

  // Memoized caches for parsed values to avoid re-parsing
  const durationCache = useMemo(() => new Map<string, number>(), []);
  const dateCache = useMemo(() => new Map<string, number>(), []);

  // Parse duration string to seconds for sorting (with caching)
  const parseDuration = (duration: string): number => {
    if (durationCache.has(duration)) return durationCache.get(duration)!;
    const match = duration.match(/(\d+)d\s*(\d+)h\s*(\d+)m\s*(\d+)s/);
    const result = match
      ? Number(match[1]) * 86400 + Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4])
      : 0;
    durationCache.set(duration, result);
    return result;
  };

  // Parse date string for sorting (with caching)
  const parseDate = (dateStr: string): number => {
    if (dateCache.has(dateStr)) return dateCache.get(dateStr)!;
    const match = dateStr.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    const result = match
      ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5]), Number(match[6])).getTime()
      : 0;
    dateCache.set(dateStr, result);
    return result;
  };

  // Group services by host, or by host+status when sorting by status
  const groupedHosts = useMemo(() => {
    const hostMap = new Map<string, GroupedHost>();

    services.forEach(service => {
      // When sorting by status, group by host+status so each status level is separate
      // Otherwise, group all services for a host together
      const key = sortField === 'status'
        ? `${service.host}::${service.status}`
        : service.host;

      if (!hostMap.has(key)) {
        hostMap.set(key, {
          host: service.host,
          hostTitle: service.hostTitle,
          hostParam: service.hostParam,
          services: [],
          worstStatus: service.status,
        });
      }
      const group = hostMap.get(key)!;
      group.services.push(service);

      // Update worst status (relevant when not sorting by status)
      if (statusOrder[service.status] > statusOrder[group.worstStatus]) {
        group.worstStatus = service.status;
      }
    });

    return Array.from(hostMap.values());
  }, [services, sortField]);

  // Filter and sort grouped hosts
  const filteredHosts = useMemo(() => {
    let result = groupedHosts.map(group => {
      // Filter services within each group
      let filteredServices = [...group.services];

      if (filter !== 'ALL') {
        filteredServices = filteredServices.filter(s => s.status === filter);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filteredServices = filteredServices.filter(
          s =>
            s.host.toLowerCase().includes(searchLower) ||
            s.service.toLowerCase().includes(searchLower) ||
            s.statusInfo.toLowerCase().includes(searchLower)
        );
      }

      // Recalculate worst status for filtered services
      let worstStatus: ServiceStatus = 'OK';
      filteredServices.forEach(s => {
        if (statusOrder[s.status] > statusOrder[worstStatus]) {
          worstStatus = s.status;
        }
      });

      // Sort services within group based on current sort settings
      filteredServices.sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'service':
            comparison = a.service.localeCompare(b.service);
            break;
          case 'status':
            comparison = statusOrder[a.status] - statusOrder[b.status];
            break;
          case 'lastCheck':
            comparison = parseDate(a.lastCheck) - parseDate(b.lastCheck);
            break;
          case 'duration':
            comparison = parseDuration(a.duration) - parseDuration(b.duration);
            break;
          case 'statusInfo':
            comparison = a.statusInfo.localeCompare(b.statusInfo);
            break;
          default:
            comparison = statusOrder[a.status] - statusOrder[b.status];
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });

      return {
        ...group,
        services: filteredServices,
        worstStatus,
      };
    });

    // Remove empty groups
    result = result.filter(group => group.services.length > 0);

    // Sort groups based on current sort settings
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'host':
          comparison = a.host.localeCompare(b.host);
          break;
        case 'status':
          comparison = statusOrder[a.worstStatus] - statusOrder[b.worstStatus];
          break;
        default:
          // For other fields, sort by worst status first, then by host name
          comparison = statusOrder[a.worstStatus] - statusOrder[b.worstStatus];
          if (comparison === 0) {
            comparison = a.host.localeCompare(b.host);
          }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [groupedHosts, filter, search, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'status' ? 'desc' : 'asc');
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return <span className="sort-indicator">⇅</span>;
    return (
      <span className="sort-indicator active">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const toggleHost = (hostParam: string) => {
    setExpandedHosts(prev => {
      const next = new Set(prev);
      if (next.has(hostParam)) {
        next.delete(hostParam);
      } else {
        next.add(hostParam);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedHosts(new Set(filteredHosts.map(h => h.hostParam || h.host)));
  };

  const collapseAll = () => {
    setExpandedHosts(new Set());
  };

  const handleRefreshHost = async (group: GroupedHost) => {
    const hostKey = group.hostParam || group.host;

    if (refreshingHosts.has(hostKey)) return;

    setRefreshingHosts(prev => new Set(prev).add(hostKey));

    try {
      const success = await forceHostServicesCheck(group.services);
      if (!success) {
        console.error('Failed to refresh some services for host:', group.host);
      }
    } finally {
      setTimeout(() => {
        setRefreshingHosts(prev => {
          const next = new Set(prev);
          next.delete(hostKey);
          return next;
        });
      }, 2000);
    }
  };

  const statusCounts = useMemo(() => {
    return services.reduce(
      (acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      },
      {} as Record<ServiceStatus, number>
    );
  }, [services]);

  const isHostRefreshing = (hostKey: string) => {
    return refreshingHosts.has(hostKey);
  };

  const totalFilteredServices = filteredHosts.reduce((sum, h) => sum + h.services.length, 0);

  return (
    <div className="service-table-container">
      <div className="table-controls">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All ({services.length})
          </button>
          <button
            className={`filter-btn critical ${filter === 'CRITICAL' ? 'active' : ''}`}
            onClick={() => setFilter('CRITICAL')}
          >
            Critical ({statusCounts.CRITICAL || 0})
          </button>
          <button
            className={`filter-btn warning ${filter === 'WARNING' ? 'active' : ''}`}
            onClick={() => setFilter('WARNING')}
          >
            Warning ({statusCounts.WARNING || 0})
          </button>
          <button
            className={`filter-btn unknown ${filter === 'UNKNOWN' ? 'active' : ''}`}
            onClick={() => setFilter('UNKNOWN')}
          >
            Unknown ({statusCounts.UNKNOWN || 0})
          </button>
          <button
            className={`filter-btn ok ${filter === 'OK' ? 'active' : ''}`}
            onClick={() => setFilter('OK')}
          >
            OK ({statusCounts.OK || 0})
          </button>
        </div>
        <div className="table-actions">
          <button className="expand-btn" onClick={expandAll}>Expand All</button>
          <button className="expand-btn" onClick={collapseAll}>Collapse All</button>
          <input
            type="text"
            className="search-input"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="service-table">
          <thead>
            <tr>
              <th className="expand-col"></th>
              <th onClick={() => handleSort('host')}>
                Host {getSortIndicator('host')}
              </th>
              <th onClick={() => handleSort('service')}>
                Service {getSortIndicator('service')}
              </th>
              <th onClick={() => handleSort('status')}>
                Status {getSortIndicator('status')}
              </th>
              <th onClick={() => handleSort('lastCheck')}>
                Last Check {getSortIndicator('lastCheck')}
              </th>
              <th onClick={() => handleSort('duration')}>
                Duration {getSortIndicator('duration')}
              </th>
              <th onClick={() => handleSort('statusInfo')}>
                Status Information {getSortIndicator('statusInfo')}
              </th>
              <th className="action-col"></th>
            </tr>
          </thead>
          <tbody>
            {filteredHosts.map(group => {
              const hostKey = group.hostParam || group.host;
              const isExpanded = expandedHosts.has(hostKey);
              const serviceCount = group.services.length;
              const refreshing = isHostRefreshing(hostKey);

              return (
                <Fragment key={`group-${hostKey}`}>
                  {/* Host row */}
                  <tr
                    className={`host-row status-${group.worstStatus.toLowerCase()}`}
                    onClick={() => toggleHost(hostKey)}
                  >
                    <td className="expand-cell">
                      <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                    </td>
                    <td className="host-cell">
                      <span className="host-name">{group.host}</span>
                      {group.hostTitle && (
                        <span className="host-ip">{group.hostTitle}</span>
                      )}
                    </td>
                    <td className="service-count">{serviceCount} service{serviceCount !== 1 ? 's' : ''}</td>
                    <td>
                      <span className={`status-badge ${group.worstStatus.toLowerCase()}`}>
                        {group.worstStatus}
                      </span>
                    </td>
                    <td colSpan={3}></td>
                    <td className="action-cell">
                      <button
                        className={`refresh-service-btn ${refreshing ? 'refreshing' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefreshHost(group);
                        }}
                        disabled={refreshing}
                        title={`Force check all ${serviceCount} services`}
                      >
                        {refreshing ? (
                          <span className="refresh-icon spinning">↻</span>
                        ) : (
                          <span className="refresh-icon">↻</span>
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Service rows (when expanded) */}
                  {isExpanded && group.services.map((service, index) => (
                    <tr
                      key={`${hostKey}-${service.serviceParam}-${index}`}
                      className={`service-row status-${service.status.toLowerCase()}`}
                    >
                      <td></td>
                      <td></td>
                      <td className="service-name">{service.service}</td>
                      <td>
                        <span className={`status-badge ${service.status.toLowerCase()}`}>
                          {service.status}
                          {service.attempt && <span className="attempt"> ({service.attempt})</span>}
                        </span>
                      </td>
                      <td className="nowrap">{service.lastCheck}</td>
                      <td className="nowrap">{service.duration}</td>
                      <td className="status-info">{service.statusInfo}</td>
                      <td></td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredHosts.length === 0 && (
        <div className="no-results">
          No services match the current filters
        </div>
      )}

      <div className="table-footer">
        Showing {totalFilteredServices} services across {filteredHosts.length} hosts
      </div>
    </div>
  );
}
