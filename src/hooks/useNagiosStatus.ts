import { useState, useEffect, useCallback } from 'react';
import type { NagiosStatus } from '../types/nagios';
import { parseNagiosHtml } from '../utils/nagiosParser';

// Use relative path for proxy in development, full URL for production
const NAGIOS_STATUS_API = import.meta.env.VITE_NAGIOS_STATUS_API || '/cgi-bin/status.cgi?host=all&sorttype=2&sortoption=3&limit=0';
const REFRESH_INTERVAL = parseInt(import.meta.env.VITE_REFRESH_INTERVAL || '90', 10) * 1000;

export function useNagiosStatus() {
  const [status, setStatus] = useState<NagiosStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use /nagios prefix for proxy
      const url = `/nagios${NAGIOS_STATUS_API}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const parsed = parseNagiosHtml(html);
      setStatus(parsed);
      setLastFetch(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Nagios status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return {
    status,
    loading,
    error,
    lastFetch,
    refresh: fetchStatus,
  };
}
