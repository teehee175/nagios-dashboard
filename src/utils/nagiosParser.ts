import type { NagiosStatus, ServiceEntry, ServiceStatus, HostTotals, ServiceTotals } from '../types/nagios';

export function parseNagiosHtml(html: string): NagiosStatus {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const lastUpdated = extractLastUpdated(doc);
  const hostTotals = extractHostTotals(doc);
  const serviceTotals = extractServiceTotals(doc);
  const services = extractServices(doc);

  return {
    lastUpdated,
    hostTotals,
    serviceTotals,
    services,
  };
}

function extractLastUpdated(doc: Document): string {
  const infoBox = doc.querySelector('.infoBox');
  if (infoBox) {
    const text = infoBox.textContent || '';
    const match = text.match(/Last Updated:\s*([^\n]+)/);
    if (match) {
      return match[1].trim();
    }
  }
  return new Date().toLocaleString();
}

function extractHostTotals(doc: Document): HostTotals {
  const hostTable = doc.querySelector('.hostTotals');
  const totals: HostTotals = {
    up: 0,
    down: 0,
    unreachable: 0,
    pending: 0,
    allProblems: 0,
    allTypes: 0,
  };

  if (hostTable) {
    const upCell = doc.querySelector('.hostTotalsUP');
    const downCell = doc.querySelector('.hostTotalsDOWN');
    const problemsCell = doc.querySelector('.hostTotalsPROBLEMS');

    if (upCell) totals.up = parseInt(upCell.textContent || '0', 10);
    if (downCell) totals.down = parseInt(downCell.textContent || '0', 10);
    if (problemsCell) totals.allProblems = parseInt(problemsCell.textContent || '0', 10);

    // Find unreachable and pending from table cells
    const hostTables = doc.querySelectorAll('table.hostTotals');
    hostTables.forEach(table => {
      const cells = table.querySelectorAll('td.hostTotals');
      cells.forEach((cell, index) => {
        const headers = table.querySelectorAll('th.hostTotals a');
        if (headers[index]) {
          const href = headers[index].getAttribute('href') || '';
          const value = parseInt(cell.textContent || '0', 10);
          if (href.includes('hoststatustypes=8')) totals.unreachable = value;
          if (href.includes('hoststatustypes=1')) totals.pending = value;
        }
      });
      // Get all types from last table
      const lastCell = cells[cells.length - 1];
      if (lastCell && table.textContent?.includes('All Types')) {
        totals.allTypes = parseInt(lastCell.textContent || '0', 10);
      }
    });
  }

  return totals;
}

function extractServiceTotals(doc: Document): ServiceTotals {
  const totals: ServiceTotals = {
    ok: 0,
    warning: 0,
    unknown: 0,
    critical: 0,
    pending: 0,
    allProblems: 0,
    allTypes: 0,
  };

  const okCell = doc.querySelector('.serviceTotalsOK');
  const warningCell = doc.querySelector('.serviceTotalsWARNING');
  const unknownCell = doc.querySelector('.serviceTotalsUNKNOWN');
  const criticalCell = doc.querySelector('.serviceTotalsCRITICAL');
  const problemsCell = doc.querySelector('.serviceTotalsPROBLEMS');

  if (okCell) totals.ok = parseInt(okCell.textContent || '0', 10);
  if (warningCell) totals.warning = parseInt(warningCell.textContent || '0', 10);
  if (unknownCell) totals.unknown = parseInt(unknownCell.textContent || '0', 10);
  if (criticalCell) totals.critical = parseInt(criticalCell.textContent || '0', 10);
  if (problemsCell) totals.allProblems = parseInt(problemsCell.textContent || '0', 10);

  // Find pending and all types
  const serviceTables = doc.querySelectorAll('table.serviceTotals');
  serviceTables.forEach(table => {
    const cells = table.querySelectorAll('td.serviceTotals');
    cells.forEach((cell, index) => {
      const headers = table.querySelectorAll('th.serviceTotals a');
      if (headers[index]) {
        const href = headers[index].getAttribute('href') || '';
        const value = parseInt(cell.textContent || '0', 10);
        if (href.includes('servicestatustypes=1')) totals.pending = value;
      }
    });
    // Get all types
    const lastCell = cells[cells.length - 1];
    if (lastCell && table.textContent?.includes('All Types')) {
      totals.allTypes = parseInt(lastCell.textContent || '0', 10);
    }
  });

  return totals;
}

function extractServices(doc: Document): ServiceEntry[] {
  const services: ServiceEntry[] = [];
  const statusTable = doc.querySelector('table.status');

  if (!statusTable) return services;

  const rows = statusTable.querySelectorAll('tr');
  let currentHost = '';
  let currentHostTitle = '';
  let currentHostParam = '';

  rows.forEach(row => {
    // Skip header rows and empty rows
    if (row.querySelector(':scope > th') || row.children.length < 7) return;

    // IMPORTANT: Use :scope > td to get only direct child td elements, not nested ones
    // The Nagios HTML has nested tables inside cells which would cause querySelectorAll('td')
    // to return too many elements and misalign the column data
    const cells = row.querySelectorAll(':scope > td');
    if (cells.length < 7) return;

    // Check if this row has a host cell (first column)
    const hostCell = cells[0];
    const hostLink = hostCell.querySelector('a[href*="extinfo.cgi?type=1"]');
    if (hostLink) {
      currentHost = hostLink.textContent?.trim() || '';
      currentHostTitle = hostLink.getAttribute('title') || '';
      // Extract host param from href: extinfo.cgi?type=1&host=All+Customers
      const hostHref = hostLink.getAttribute('href') || '';
      const hostMatch = hostHref.match(/host=([^&]+)/);
      currentHostParam = hostMatch ? hostMatch[1] : '';
    }

    // Get service info
    const serviceCell = cells[1];
    const serviceLink = serviceCell.querySelector('a[href*="extinfo.cgi?type=2"]');
    if (!serviceLink) return;

    const service = serviceLink.textContent?.trim() || '';

    // Extract host and service params from href: extinfo.cgi?type=2&host=All+Customers&service=All+-+SSL+Expiry
    const serviceHref = serviceLink.getAttribute('href') || '';
    const serviceHostMatch = serviceHref.match(/host=([^&]+)/);
    const serviceMatch = serviceHref.match(/service=([^&]+)/);
    const hostParam = serviceHostMatch ? serviceHostMatch[1] : currentHostParam;
    const serviceParam = serviceMatch ? serviceMatch[1] : '';

    // Get status - check both class name and text content
    const statusCell = cells[2];
    const statusClass = statusCell.className.toUpperCase();
    const statusText = statusCell.textContent?.trim().toUpperCase() || '';
    let status: ServiceStatus = 'UNKNOWN';

    // Check class first (more reliable), then fall back to text
    if (statusClass.includes('CRITICAL') || statusText === 'CRITICAL') status = 'CRITICAL';
    else if (statusClass.includes('WARNING') || statusText === 'WARNING') status = 'WARNING';
    else if (statusClass.includes('UNKNOWN') || statusText === 'UNKNOWN') status = 'UNKNOWN';
    else if (statusClass.includes('PENDING') || statusText === 'PENDING') status = 'PENDING';
    else if (statusClass.includes('OK') || statusText === 'OK') status = 'OK';

    // Get other fields
    const lastCheck = cells[3].textContent?.trim() || '';
    const duration = cells[4].textContent?.trim() || '';
    const attempt = cells[5].textContent?.trim() || '';
    const statusInfo = cells[6].textContent?.trim() || '';

    services.push({
      host: currentHost,
      hostTitle: currentHostTitle,
      hostParam,
      service,
      serviceParam,
      status,
      lastCheck,
      duration,
      attempt,
      statusInfo,
    });
  });

  return services;
}
