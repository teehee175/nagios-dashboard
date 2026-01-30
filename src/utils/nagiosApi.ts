import type { ServiceEntry } from '../types/nagios';

/**
 * Force a service check via Nagios command API
 * cmd_typ=7 = SCHEDULE_FORCED_SVC_CHECK
 */
export async function forceServiceCheck(hostParam: string, serviceParam: string): Promise<boolean> {
  const url = '/nagios/cgi-bin/cmd.cgi';

  // Build form data for the command
  // cmd_typ=7 is SCHEDULE_FORCED_SVC_CHECK
  // cmd_mod=2 is to commit the command
  const formData = new URLSearchParams();
  formData.append('cmd_typ', '7');
  formData.append('cmd_mod', '2');
  formData.append('host', decodeURIComponent(hostParam.replace(/\+/g, ' ')));
  formData.append('service', decodeURIComponent(serviceParam.replace(/\+/g, ' ')));
  formData.append('force_check', '');
  formData.append('start_time', new Date().toLocaleString('en-AU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', ''));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to force service check:', error);
    return false;
  }
}

/**
 * Force check all services for a host
 * Sends parallel requests for each service
 */
export async function forceHostServicesCheck(services: ServiceEntry[]): Promise<boolean> {
  if (services.length === 0) return true;

  const results = await Promise.all(
    services.map(service => forceServiceCheck(service.hostParam, service.serviceParam))
  );

  return results.every(r => r);
}
