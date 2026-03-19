# Nagios Monitoring Configuration

This directory contains Nagios monitoring configuration files for the Digital Wardrobe Application infrastructure.

## Overview

Nagios is configured to monitor:
- Application Server (Node.js application, HTTP endpoints, system resources)
- Database Server (MongoDB, system resources)
- System metrics (CPU, memory, disk, network)

## Configuration Files

- `nagios.cfg` - Main Nagios configuration
- `commands.cfg` - Command definitions
- `contacts.cfg` - Contact and notification settings
- `timeperiods.cfg` - Time period definitions
- `templates.cfg` - Host and service templates
- `servers/` - Individual host configurations

## Access

After deployment, access Nagios web interface at:
- URL: `http://<nagios-server-ip>/nagios`
- Username: `nagiosadmin`
- Password: (set during Ansible deployment)

## Monitoring Services

### Application Server
- PING check
- SSH service
- HTTP endpoint (port 3000)
- Node.js process status
- System resources (CPU, memory, disk)

### Database Server
- PING check
- SSH service
- MongoDB service (port 27017)
- System resources (CPU, memory, disk)

## NRPE Configuration

NRPE (Nagios Remote Plugin Executor) is installed on all monitored hosts to allow remote execution of Nagios plugins.

## Custom Checks

You can add custom checks by:
1. Adding commands to `commands.cfg`
2. Creating service definitions in host configuration files
3. Installing required plugins on monitored hosts

