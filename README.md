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
- **Nginx** (for production deployment)
- **Nagios Core** with CGI access enabled

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

# Install nginx (if not already installed)
yum install -y epel-release
yum install -y nginx

# Verify installations
node --version  # Should be v18.x.x
nginx -v
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

### 3. Configure Nginx

```bash
# Copy nginx config
cp deploy/nginx.conf /etc/nginx/conf.d/nagios-dashboard.conf

# Edit the config to set your Nagios server URL
vi /etc/nginx/conf.d/nagios-dashboard.conf
# Change proxy_pass under location /nagios/ to your Nagios server

# Test and reload nginx
nginx -t
systemctl reload nginx
```

### 4. Configure SELinux (if enabled)

```bash
# Allow nginx to make network connections (for proxying to Nagios)
setsebool -P httpd_can_network_connect 1

# If serving from non-standard directory
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

### 6. Access the Dashboard

Open your browser to: `http://your-server-ip/`

## Configuration

### Environment Variables

Create a `.env` file in the project root (optional):

```env
# Nagios API endpoint (relative to proxy)
VITE_NAGIOS_STATUS_API=/cgi-bin/status.cgi?host=all&sorttype=2&sortoption=3&limit=0

# Refresh interval in seconds
VITE_REFRESH_INTERVAL=90
```

### Nginx Proxy Configuration

The default nginx config proxies `/nagios/` requests to `http://127.0.0.1:8080/nagios/`.

**If Nagios is on a different server**, edit `/etc/nginx/conf.d/nagios-dashboard.conf`:

```nginx
location /nagios/ {
    proxy_pass http://nagios-server.example.com/nagios/;
    # ... rest of config
}
```

**If Nagios requires authentication**, the dashboard passes through browser authentication headers. Configure your browser to authenticate with Nagios.

## Directory Structure

```
nagios-dashboard/
├── deploy/
│   ├── nginx.conf           # Nginx configuration template
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

1. Check nginx is running: `systemctl status nginx`
2. Check nginx can reach Nagios: `curl -I http://localhost/nagios/`
3. Check SELinux: `getsebool httpd_can_network_connect`
4. Check nginx logs: `tail -f /var/log/nginx/nagios-dashboard-error.log`

### Blank page / JavaScript errors

1. Verify build completed: `ls -la /var/www/nagios-dashboard/dist/`
2. Check browser console for errors
3. Ensure index.html is being served: `curl http://localhost/`

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
