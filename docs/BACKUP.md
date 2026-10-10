# Backup & recovery (PostgreSQL)

## Automated backups

```bash
# nightly logical backup (cron on the db host)
pg_dump "$DATABASE_URL" -Fc -f /backups/chap-$(date +%F).dump
```

- Retain 30 daily + 12 monthly copies, encrypted at rest, stored off-site.
- Also enable your managed provider's point-in-time recovery (PITR).

## Restore drill (monthly)

```bash
createdb chap_restore
pg_restore -d chap_restore /backups/chap-<date>.dump
npx prisma migrate deploy  # ensure schema parity
```

## Media

- Version object storage with cross-region replication; test a single-object restore quarterly.
