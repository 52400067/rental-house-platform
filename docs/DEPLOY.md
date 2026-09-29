# TROSV - Deploy runbook (Debian)

> May chu bat ky: cloud nao cung duoc, may slam ca nhan, may phong lab -
> mien la **Debian 12 (bookworm) hoac 13 (trixie)** + Docker hoac Podman
> + quyen sudo. File nay la runbook duy nhat cho viec deploy; backup/restore
> xem `scripts/RESTORE.md`, rollback code xem `scripts/ROLLBACK.md`.

Mot file `docker-compose.yml` duy nhat phuc dev, demo va production:

| Che do | Lenh | Cong browser dung |
|---|---|---|
| Demo HTTP | `docker compose up -d --build` | `http://<host>:5174`, API `:8000`, WS `:8080` |
| **Production TLS (khuyen dung)** | `docker compose --profile tls up -d --build` | Chi `https://$DOMAIN` (80 -> 301 HTTPS, WS la `wss://$DOMAIN/app/*`) |

TLS mode: Caddy tu cap + tu gia han chung Let's Encrypt. Can dung mot ten
mien (DNS A record tro ve may chu) - IP tran khong lay duoc chung chi tin
cay. Chua co mien? DuckDNS mien phi (`yourname.duckdns.org`).

> Day la setup demo/production-lite: du lieu seed, mat khau demo public.
> Truoc khi dua du lieu that vao: doi mat khau tat ca tai khoan, dat
> `DB_PASSWORD`, va bat backup hang ngay (muc 6).

## 0. Yeu cau (Debian)

- Debian 12/13, 2 GB RAM la du (stack: PostgreSQL + PHP + nginx + Caddy + Reverb + queue).
- Docker Engine + plugin compose (cach nhanh nhat, neu khong co):

  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"   # dang nhap lai de dung docker khong sudo
  ```

  Podman rootless cung chay duoc: thay `docker` bang `podman compose`;
  podman can file override dat `NGINX_DNS_RESOLVER` = IP gateway cua mang
  (vd `10.89.0.1`) - xem `docker-compose.local-test.yml` lam mau.
- Git, curl: `sudo apt install -y git curl`
- Firewall (neu dung ufw; bo qua neu nha cung cap quan ly firewall rieng):

  ```bash
  sudo apt install -y ufw
  sudo ufw allow 22/tcp    # SSH - allow TRUOC khi enable
  sudo ufw allow 80,443/tcp
  sudo ufw enable
  ```

  Demo HTTP mode (khong TLS): mo 5174, 8000, 8080 thay cho 80/443 - nhung
  khuyen dung TLS mode, khong mo cong nao khac.

## 1. Lay code + cau hinh

```bash
sudo mkdir -p /srv/trosv && sudo chown "$USER" /srv/trosv
git clone <repo-url> /srv/trosv && cd /srv/trosv
git checkout stable
cp .env.example .env
```

Dien `.env` cho TLS mode (thay `trosv.example.com` bang mien cua ban):

```dotenv
APP_KEY=base64:...            # lenh sinh o duoi day
DOMAIN=trosv.example.com
FRONTEND_URL=https://trosv.example.com
WS_HOST=trosv.example.com
APP_ENV=production
APP_DEBUG=false
DB_PASSWORD=<mat-khau-db-manh>
REVERB_APP_ID=...             # chuoi bat ky, dung key that khong dung my-app-key
REVERB_APP_KEY=...
REVERB_APP_SECRET=...
SEED_ON_BOOT=1                # CHI cho demo; production du lieu that: 0
```

Sinh `APP_KEY` (khong can PHP tren may chu):

```bash
echo "APP_KEY=$(docker run --rm php:8.3-cli php -r 'echo "base64:".base64_encode(random_bytes(32));')" >> .env
chmod 600 .env
```

DNS: tao record A `$DOMAIN -> IP may chu` TRUOC khi chay lan dau (Caddy
can cong 80 tu internet de thuc hien HTTP-01 challenge).

## 2. Build + chay (lan dau)

```bash
docker compose --profile tls up -d --build
docker compose logs -f backend   # doi thay migrate/seed xong, Ctrl+C
docker compose ps                # ca 6 service phai healthy/running
```

Caddy bat dau phat hanh chung chi ngay luc nay - xem tien do:

```bash
docker compose logs -f caddy     # thanh cong: "certificate obtained successfully"
```

## 3. Kiem tra

```bash
DOMAIN="$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '"')"
curl -sf "https://$DOMAIN/api/health" && echo " API OK"
curl -s -o /dev/null -w 'frontend: %{http_code}\n' "https://$DOMAIN/"
curl -s  "https://$DOMAIN/api/cities" | head -c 120; echo
```

Bang browser: mo `https://$DOMAIN`, dang nhap `student1@example.com` /
`password` (khi `SEED_ON_BOOT=1`). Thu chat realtime: mo them 1 cua so
an danh, dang nhap bang chu nha, nhan tin tu trang phong - badge khong doc
tang ngay = WebSocket (`wss://$DOMAIN/app/*`) chay dung.

## 4. Deploy-on-green (GitHub Actions tu dong)

Workflow `.github/workflows/deploy.yml` chay khi CI xanh tren tip `stable`:
SSH vao may chu, `git reset --hard <sha>`, `docker compose --profile tls
up -d --build`, roi smoke `api/health` + frontend + cities qua Caddy.
Cau hinh mot lan trong GitHub: Settings -> Environments -> `production`
-> secrets:

| Secret | Gia tri |
|---|---|
| `DEPLOY_HOST` | IP hoac hostname may chu |
| `DEPLOY_USER` | user SSH (thuoc group `docker`) |
| `DEPLOY_SSH_KEY` | private key PEM (public key dua vao `~/.ssh/authorized_keys`) |
| `DEPLOY_PATH` | `/srv/trosv` |
| `DEPLOY_PORT` | tuy chon, mac dinh 22 |

Tu luc do: merge PR sang `stable` = deploy tu dong. Chua co secrets thi
workflow tu bo qua (khong bao do).

## 5. Cheatsheet

```bash
docker compose ps                        # trang thai
docker compose logs -f backend reverb    # log truc tiep
docker compose --profile tls up -d --build   # sau khi sua code/.env
docker compose --profile tls restart caddy   # doi DOMAIN (Caddyfile mount, khong bake)
docker compose exec backend php artisan migrate:fresh --seed --force  # CHI demo
docker compose down                      # dung, GIU du lieu
docker compose down -v                   # XOA pgdata + uploads - coi chung
```

## 6. Backup hang ngay (bat buoc truoc khi co du lieu that)

Script san sang: `scripts/backup.sh` (dump DB + tar uploads + ban sao
`.env`, giu 7 ngay + 4 chu nhat). Cron tren may chu:

```bash
sudo crontab -e -u "$USER"
# 02:30 hang ngay:
30 2 * * * cd /srv/trosv && ./scripts/backup.sh >> ./backups/backup.log 2>&1
```

Restore drill + quy trinh: `scripts/RESTORE.md`. Rollback code:
`scripts/ROLLBACK.md`. Kiem tra lai backup dinh ky: `./scripts/backup.sh --verify`.

## 7. Gotchas

- **Moi request tra 500 "Loi may chu."** - backend tu choi serve vi cau
  hinh khong an toan (`APP_DEBUG=true` hoac thieu `APP_KEY`). Log chua
  dong `Refusing to serve: ...` - sua `.env` roi `up -d --build backend`.
- **Caddy khong lay duoc chung chi** - DNS A record chua tro ve may chu,
  hoac cong 80 bi chan tu internet. Xem `docker compose logs caddy`.
- **Chat khong realtime** - kiem tra caddy container dang chay va browser
  noi `wss://$DOMAIN/app/*` (TLS mode). HTTP mode: cong 8080 phai mo.
- **CORS error** - `FRONTEND_URL` phai khop chinh xac origin browser
  (scheme + host, khong co slash cuoi), roi rebuild backend + frontend.
- **Sua `.env` khong co tac dung** - frontend bake `VITE_*` luc build:
  phai `up -d --build` (restart khong du).
- **Anh bien mat sau `down`** - uploads nam trong volume `trosv-storage`;
  `down -v` xoa no. Chi `down` la giu.
