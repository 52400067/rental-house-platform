# Restore - TROSV production

Quy trình restore cho stack compose cua `deploy.yml` (TLS profile). Doc het file nay
TRUOC khi lam. Diem khong-duong-lui duy nhat la buoc 2 (xoa volume `pgdata`) - hay
chac chan ban backup muon restore nam trong `/opt/trosv-backups` (hoac da copy ve
VPS) truoc khi bat dau.

Khoi phuc ben tren VPS, trong thu muc repo (vi du `/opt/trosv`).

## 0. Chon ban backup

```bash
ls -1t /opt/trosv-backups/db-*.sql.gz | head -5
TS=20260927-023000   # ts cua ban muon restore
ls -lh /opt/trosv-backups/{db-$TS.sql.gz,uploads-$TS.tar.gz,env-$TS.bak}
```

Moi lenh duoi day dung mot bien chung:

```bash
DC="docker compose --profile tls"
```

Ten volume co tien to ten project (ten thu muc repo), nen resolve dong thay vi doan:

```bash
VOL_PG="$(docker volume ls -q | grep -E 'pgdata$' | head -1)"
VOL_STORAGE="$(docker volume ls -q | grep -E 'trosv-storage$' | head -1)"
echo "$VOL_PG / $VOL_STORAGE"   # phai in ra dung 2 ten, khong duoc trong
```

## 1. Dung toan bo stack

```bash
$DC stop caddy backend reverb queue scheduler db
```

## 2. Xoa + tao lai volume Postgres (KHONG DUONG LUI)

`$DC down` bo container nhung GIU nguyen volume; ta xoa volume rong roi tao lai:

```bash
$DC down
docker volume rm "$VOL_PG"
docker volume create "$VOL_PG"
```

## 3. Khoi dong db rong + doi healthy

POSTGRES_* env se tao lai user/db `rental` tren volume moi:

```bash
$DC up -d db
$DC exec db sh -c 'until pg_isready -U rental -d rental >/dev/null 2>&1; do sleep 1; done'
```

## 4. Nap dump (plain SQL, gzip)

```bash
gunzip -c "/opt/trosv-backups/db-$TS.sql.gz" | $DC exec -T db psql -U rental -d rental -q
```

Loi thuong gap:
- `role "rental" does not exist` = buoc 3 chua xong (volume chua duoc khoi tao boi
  POSTGRES_* env) - doi `pg_isready` xong roi nap lai.
- `relation ... already exists` = volume KHONG rong - quay lai buoc 2 xoa volume dung,
  khong nap dump vao DB da co du lieu.

Kiem tra nhanh so bang duoc nap:

```bash
$DC exec db psql -U rental -d rental -c "\dt" | head -15
$DC exec db psql -U rental -d rental -tAc \
  "SELECT 'users='||(SELECT count(*) FROM users)||' listings='||(SELECT count(*) FROM listings);"
```

## 5. Khoi phuc uploads (anh listing)

Volume `trosv-storage` bi backend mount vao; stop backend truoc khi thay the du lieu:

```bash
$DC stop backend
docker run --rm -v "$VOL_STORAGE":/data -v /opt/trosv-backups:/backup:ro alpine:3.20 \
    sh -c "rm -rf /data/* && tar xzf /backup/uploads-$TS.tar.gz -C /data"
$DC start backend
```

## 6. Khoi phuc `.env` (neu mat / doi may chu)

`.env` chua APP_KEY - neu khong khoi phuc dung ban cu, cookie/session + token
Reverb bi doi, moi nguoi phai dang nhap lai:

```bash
cp "/opt/trosv-backups/env-$TS.bak" .env
```

## 7. Khoi dong lai toan bo + kiem tra

```bash
$DC up -d
sleep 20
curl -sf https://"$DOMAIN"/api/health && echo " API OK"
curl -s -o /dev/null -w 'frontend: %{http_code}\n' https://"$DOMAIN"/
curl -s -o /dev/null -w 'cities:   %{http_code}\n' https://"$DOMAIN"/api/cities
```

Cuoi cung smoke thu nhan: dang nhap 1 tai khoan that tu DB da restore tren UI.

## Sau restore

- Kiem tra `docker compose logs -f --tail 50 backend queue reverb` trong vai phut dau.
- Neu cron backup da ton tai, no se tu chay buoc toi - khong can lam gi them.
