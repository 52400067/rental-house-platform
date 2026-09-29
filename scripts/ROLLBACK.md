# Rollback - TROSV production

Khi 1 deployment tren `stable` bi loi va can quay lai ban truoc. Doc khop
voi `.github/workflows/deploy.yml` (deploy = `git reset --hard <sha>` +
`docker compose --profile tls up -d --build`) va `scripts/RESTORE.md` (khi
phai quay lai du lieu).

## 0. Tim SHA tot cuoi cung

Moi deploy run gan voi mot SHA cu the - xem: GitHub -> tab Actions ->
workflow "Deploy" -> run gan nhat con tot -> commit duoc deploy
(`head_sha`). Hoac tren may chu:

```bash
cd /srv/trosv
git fetch origin stable --tags
git log --oneline -5 origin/stable   # sha can quay ve nam ngay tren commit loi
GOOD=<sha-tot>
```

## 1. Rollback code (1 lan)

```bash
DC="docker compose --profile tls"
cd /srv/trosv
git fetch origin stable --tags
git reset --hard $GOOD
$DC up -d --build
```

Smoke nhanh (giong post-deploy smoke cua deploy.yml):

```bash
DOMAIN="$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '\"')"
R="--resolve $DOMAIN:443:127.0.0.1"
curl -sf $R https://$DOMAIN/api/health
curl -s -o /dev/null -w 'frontend: %{http_code}\n' $R https://$DOMAIN/
curl -s -o /dev/null -w 'cities:   %{http_code}\n' $R https://$DOMAIN/api/cities
```

## 2. Quan trong: migration chi di xuoi

`php artisan migrate --force` trong backend container khong tu roll back. Neu
commit loi CHAY migration lam hong du lieu/schema thi rollback code khong du -
phai restore DB tu backup: xem `scripts/RESTORE.md` (buoc 2 la khong-duong-lui).

Neu commit loi chua migration: tu sao luu DB hien tai TRUOC khi reset:

```bash
bash scripts/backup.sh
```

## 3. Sau khi da rollback

- Doan tot: commit fix tren nhanh feature -> merge `unstable` -> PR sang `stable`
  nhu thuong. KHONG force-push de "ghi de" lich su `stable` (branch protection
  da chan force-push).
- Neu nghien cuu nguyen nhan: keo log may chu ve may
  `docker compose logs --since 1h backend > /tmp/trosv-rollback.log`.
