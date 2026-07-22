# Operations Handbook

## Monitoring
- Application logs: Winston console transport + file transport
- Health endpoint: `/health`
- Process manager: PM2 or Docker healthchecks

## Backup
- Database: automated daily backups
- Uploaded templates: Cloudinary backup or S3 replication

## Alerts
- API 5xx rate threshold
- Queue depth (if async)
- Disk usage on template storage

## Incident Response
1. Acknowledge alert
2. Check `TROUBLESHOOTING.md`
3. If unresolved, execute `ROLLBACK-GUIDE.md`
4. Post-mortem after resolution

## Maintenance Windows
- Preferred: Sundays 02:00-04:00 UTC
- Notify users 24 hours in advance
