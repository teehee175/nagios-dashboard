export type ServiceStatus = 'OK' | 'WARNING' | 'UNKNOWN' | 'CRITICAL' | 'PENDING';
export type HostStatus = 'UP' | 'DOWN' | 'UNREACHABLE' | 'PENDING';

export interface ServiceEntry {
  host: string;
  hostTitle: string;
  hostParam: string;  // URL-encoded host parameter for API calls
  service: string;
  serviceParam: string;  // URL-encoded service parameter for API calls
  status: ServiceStatus;
  lastCheck: string;
  duration: string;
  attempt: string;
  statusInfo: string;
}

export interface HostTotals {
  up: number;
  down: number;
  unreachable: number;
  pending: number;
  allProblems: number;
  allTypes: number;
}

export interface ServiceTotals {
  ok: number;
  warning: number;
  unknown: number;
  critical: number;
  pending: number;
  allProblems: number;
  allTypes: number;
}

export interface NagiosStatus {
  lastUpdated: string;
  hostTotals: HostTotals;
  serviceTotals: ServiceTotals;
  services: ServiceEntry[];
}
