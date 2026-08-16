# PMS production operations runbook

## Deployment contract

- Production runs only with `SPRING_PROFILES_ACTIVE=prod`.
- `.env.production` is local secret material and must never be committed.
- Before every deploy, take and verify a database backup.
- Flyway migrations are forward-only. Never use `flyway clean` against a real PMS database.
- The public entry point is Nginx. MySQL and the actuator management port are not published by Compose.

## First deployment

```bash
cp .env.production.example .env.production
# Replace every CHANGE_ME value with independently generated secrets.
docker compose --env-file .env.production config
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
docker compose --env-file .env.production ps
curl --fail http://127.0.0.1:8088/healthz
docker compose --env-file .env.production exec backend curl --fail http://127.0.0.1:8091/actuator/health/readiness
```

The first production administrator is an explicit deployment task. The development
`admin/admin123` bootstrap is guarded by the `dev` profile and never runs in production.

## Upgrade

```bash
./scripts/backup-db.sh
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=200 backend
```

Verify the Flyway log says migrations were validated/applied and readiness is `UP`.
Keep the previous application image tag until the new version has passed business smoke tests.

## Backup and restore

Backup:

```bash
docker compose --env-file .env.production exec -T mysql mysqldump \
  -uroot -p"$DB_ROOT_PASSWORD" \
  --single-transaction --routines --triggers pms_xkzoom \
  | gzip > "backup/pms-$(date +%Y%m%d-%H%M%S).sql.gz"
gzip -t backup/pms-*.sql.gz
```

Restore into a new/empty database first; never overwrite the only production copy:

```bash
gunzip -c backup/pms-YYYYMMDD-HHMMSS.sql.gz \
  | docker compose --env-file .env.production exec -T mysql mysql -uroot -p"$DB_ROOT_PASSWORD" pms_xkzoom
```

Run a monthly restore drill and record row counts for tenant, property, booking,
inventory, payment, channel and audit_log.

## Monitoring and alerts

- Liveness: `http://backend:8091/actuator/health/liveness`
- Readiness (includes DB): `http://backend:8091/actuator/health/readiness`
- Prometheus: `http://backend:8091/actuator/prometheus`
- Correlation: every HTTP response carries `X-Request-ID`; completion logs contain
  `method`, `path`, `status`, `duration_ms`, and `request_id`.

Minimum alerts:

1. readiness is not `UP` for 2 minutes;
2. 5xx ratio exceeds 2% for 5 minutes;
3. p95 HTTP latency exceeds 1 second for 10 minutes;
4. JVM heap exceeds 85% for 10 minutes;
5. Hikari active connections approach the configured maximum;
6. disk or MySQL volume exceeds 80%;
7. no successful backup in 24 hours.

## Incident checklist

1. Capture `docker compose ps`, backend logs, MySQL health, and the request ID.
2. Stop risky writes if inventory or payment correctness is uncertain.
3. Do not repair Flyway history or edit production rows without a reviewed SQL plan.
4. Roll application images back only when the previous image is schema-compatible.
5. Restore data only from a verified backup into a separate database first.
6. Record timeline, affected tenants/orders, remediation and follow-up tests.
