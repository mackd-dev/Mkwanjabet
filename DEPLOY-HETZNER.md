# Deployment on the existing Hetzner server

MkwanjaBet uses ports bound only to localhost:

- Web: `127.0.0.1:3010`
- API: `127.0.0.1:4010`
- PostgreSQL: Docker network only

This avoids conflicts with Aurax ports 3000–3002, 4000, 5432, and 6379.

## 1. Upload

```bash
mkdir -p /opt/mkwanjabet
# Upload/extract this project into /opt/mkwanjabet
cd /opt/mkwanjabet
cp .env.example .env
```

Generate strong secrets:

```bash
openssl rand -base64 48
openssl rand -base64 64
openssl rand -base64 64
```

Place different values in `.env`.

## 2. DNS

Point these A records to the server IP:

- `mkwanjabet.co.tz`
- `www.mkwanjabet.co.tz`
- `api.mkwanjabet.co.tz`

## 3. Build database and API first

```bash
docker compose build mkwanjabet-api mkwanjabet-web
docker compose up -d mkwanjabet-postgres
docker compose run --rm mkwanjabet-api npx prisma db push
docker compose run --rm mkwanjabet-api npm run db:seed
docker compose up -d mkwanjabet-api mkwanjabet-web
```

Verify locally on the server:

```bash
curl http://127.0.0.1:4010/api/v1/health
curl http://127.0.0.1:4010/api/v1/plans
curl -I http://127.0.0.1:3010
```

## 4. Nginx

```bash
cp deploy/nginx/mkwanjabet.conf /etc/nginx/sites-available/mkwanjabet
ln -s /etc/nginx/sites-available/mkwanjabet /etc/nginx/sites-enabled/mkwanjabet
nginx -t
systemctl reload nginx
```

## 5. TLS

After DNS resolves:

```bash
certbot --nginx -d mkwanjabet.co.tz -d www.mkwanjabet.co.tz
certbot --nginx -d api.mkwanjabet.co.tz
```

## 6. Backup

```bash
chmod 700 deploy/backup-postgres.sh
(crontab -l 2>/dev/null; echo '15 2 * * * /opt/mkwanjabet/deploy/backup-postgres.sh >> /opt/mkwanjabet/backups/backup.log 2>&1') | crontab -
```

Copy backups off-server as well; local-only backups are not sufficient.

## Rollback / stop

```bash
cd /opt/mkwanjabet
docker compose down
```

This does not stop or modify any Aurax container.
