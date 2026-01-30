# Nagios Dashboard

A modern React-based dashboard for Nagios Core 4.4.1, providing a clean, responsive interface for monitoring service statuses.

## Features

- **Real-time Status Display** - Auto-refreshes every 90 seconds
- **Compact View** - Fits more information on screen
- **Sortable Columns** - Sort by Host, Service, Status, Last Check, Duration, Status Info
- **Smart Grouping** - Groups services by host, separates by status when sorting by status
- **Side Panels**:
  - **Windows Updates** - Shows critical updates, reboots required, optional updates
  - **Stopped Services** - Extracts stopped services from Service Check entries
- **Filter & Search** - Filter by status (Critical, Warning, Unknown, OK) and search
- **Force Check** - Trigger immediate service checks per host

## Requirements

- **Node.js 18+** and npm
- **Apache (httpd)** with mod_proxy and mod_rewrite
- **Nagios Core** with CGI access enabled (typically on same server)

## Quick Start (Development)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/nagios-dashboard.git
cd nagios-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

## Production Deployment (CentOS/RHEL)

### 1. Install Prerequisites

```bash
# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git

# Apache (httpd) should already be installed with Nagios
# Verify installations
node --version  # Should be v18.x.x
httpd -v
```

### 2. Clone and Build

```bash
# Create deployment directory
mkdir -p /var/www
cd /var/www

# Clone repository
git clone https://github.com/YOUR_USERNAME/nagios-dashboard.git
cd nagios-dashboard

# Install dependencies and build
npm ci
npm run build
```

### 3. Configure Apache (httpd)

```bash
# Enable required modules (if not already enabled)
# These are typically enabled by default on CentOS/RHEL
# mod_proxy, mod_proxy_http, mod_rewrite, mod_headers

# Copy Apache config
cp deploy/httpd.conf /etc/httpd/conf.d/nagios-dashboard.conf

# Edit the config if needed (default assumes same server as Nagios)
vi /etc/httpd/conf.d/nagios-dashboard.conf

# Test and reload Apache
httpd -t
systemctl reload httpd
```

### 4. Configure SELinux (if enabled)

```bash
# Allow Apache to make network connections (for proxying)
setsebool -P httpd_can_network_connect 1

# Set correct SELinux context for the dashboard files
semanage fcontext -a -t httpd_sys_content_t "/var/www/nagios-dashboard/dist(/.*)?"
restorecon -Rv /var/www/nagios-dashboard/dist
```

### 5. Set Up Auto-Sync from GitHub

```bash
# Make sync script executable
chmod +x /var/www/nagios-dashboard/deploy/sync-from-github.sh

# Test the sync script
/var/www/nagios-dashboard/deploy/sync-from-github.sh

# Add to crontab for automatic updates (every 5 minutes)
crontab -e
# Add this line:
*/5 * * * * /var/www/nagios-dashboard/deploy/sync-from-github.sh >> /var/log/nagios-dashboard-sync.log 2>&1
```

### 6. Open Firewall Port (if needed)

```bash
# If using firewalld
firewall-cmd --permanent --add-port=8080/tcp
firewall-cmd --reload
```

### 7. Access the Dashboard

Open your browser to: `http://your-server-ip:8080/`

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
vi .env
```

```env
# Nagios Server (default: same server)
VITE_NAGIOS_BASE_URL=http://localhost/nagios

# Nagios API endpoint
VITE_NAGIOS_STATUS_API=/cgi-bin/status.cgi?host=all&sorttype=2&sortoption=3&limit=0

# Refresh interval in seconds
VITE_REFRESH_INTERVAL=90
```

### Apache Proxy Configuration

The default httpd config assumes Nagios runs on the same server and proxies `/nagios/` to `http://127.0.0.1/nagios/`.

**If Nagios is on a different server**, edit `/etc/httpd/conf.d/nagios-dashboard.conf`:

```apache
ProxyPass /nagios/ http://nagios-server.example.com/nagios/
ProxyPassReverse /nagios/ http://nagios-server.example.com/nagios/
```

**If Nagios requires authentication**, the dashboard passes through browser authentication headers. Your browser will prompt for Nagios credentials.

## Directory Structure

```
nagios-dashboard/
├── deploy/
│   ├── httpd.conf           # Apache configuration template
│   └── sync-from-github.sh  # Auto-sync script for live updates
├── src/
│   ├── components/          # React components
│   │   ├── ServiceTable.tsx
│   │   ├── StatusSummary.tsx
│   │   ├── WindowsUpdatePanel.tsx
│   │   └── ServiceCheckPanel.tsx
│   ├── hooks/
│   │   └── useNagiosStatus.ts
│   ├── utils/
│   │   ├── nagiosParser.ts  # HTML parser for Nagios output
│   │   └── nagiosApi.ts     # API utilities
│   └── types/
│       └── nagios.ts        # TypeScript interfaces
├── package.json
├── vite.config.ts
└── README.md
```

## Troubleshooting

### Dashboard shows "Error fetching status"

1. Check Apache is running: `systemctl status httpd`
2. Check Apache can reach Nagios: `curl -I http://localhost/nagios/`
3. Check SELinux: `getsebool httpd_can_network_connect`
4. Check Apache logs: `tail -f /var/log/httpd/nagios-dashboard-error.log`

### Blank page / JavaScript errors

1. Verify build completed: `ls -la /var/www/nagios-dashboard/dist/`
2. Check browser console for errors
3. Ensure index.html is being served: `curl http://localhost:8080/`

### Sync script not working

1. Check git permissions: `ls -la /var/www/nagios-dashboard/.git`
2. Verify remote: `git remote -v`
3. Test manual pull: `git pull origin main`
4. Check cron logs: `tail -f /var/log/nagios-dashboard-sync.log`

## Development

```bash
# Run development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

MIT
