# CẤU TRÚC THƯ MỤC DỰ ÁN

Mô hình monorepo: cả 3 service (Frontend, Backend, AI) và hạ tầng (Docker, Nginx, CI/CD) nằm chung 1 repository, mỗi service có thư mục riêng biệt, độc lập build/deploy.

```
rental-house-platform/
├── .github/
│   └── workflows/
│       ├── backend-ci.yml            # Lint + test + build image Backend
│       ├── frontend-ci.yml           # Lint + test + build image Frontend
│       ├── ai-service-ci.yml         # Lint + test + build image AI Service
│       └── deploy-staging.yml        # Pipeline deploy staging/production
│
├── docs/
│   ├── adr/                          # Architecture Decision Records
│   │   ├── 0001-tach-ai-service-rieng.md
│   │   └── 0002-chon-postgresql-va-redis.md
│   ├── API_CONTRACT.md               # Hop dong API giua FE - BE - AI
│   ├── CHANGELOG.md
│   └── architecture-diagram.md
│
├── frontend/                         # React 18 + Axios
│   ├── public/
│   ├── src/
│   │   ├── api/                      # Axios instance & cac ham goi API
│   │   │   ├── axiosClient.js
│   │   │   ├── authApi.js
│   │   │   └── aiApi.js
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── feature/
│   │   ├── constants/
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useFetch.js
│   │   ├── pages/
│   │   │   ├── Home/
│   │   │   ├── Auth/
│   │   │   └── Dashboard/
│   │   ├── store/                    # Redux Toolkit / Zustand / Context
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tests/
│   ├── .env.example
│   ├── Dockerfile
│   ├── nginx.conf                    # Nginx config rieng de serve static build
│   ├── package.json
│   └── README.md
│
├── backend/                          # PHP + Laravel
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   └── Api/
│   │   │   │       └── V1/
│   │   │   ├── Requests/             # Form Request (validate input)
│   │   │   ├── Resources/            # API Resource (format response)
│   │   │   ├── Middleware/
│   │   │   └── Clients/
│   │   │       └── AIServiceClient.php   # HTTP client goi sang FastAPI
│   │   ├── Services/                 # Business logic (Service Layer)
│   │   ├── Repositories/             # (tuy chon) Repository Pattern
│   │   ├── Models/
│   │   └── Jobs/                     # Queue Jobs (xu ly AI bat dong bo, email, ...)
│   ├── bootstrap/
│   ├── config/
│   │   └── cors.php
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── factories/
│   ├── routes/
│   │   └── api.php
│   ├── tests/
│   │   ├── Unit/
│   │   └── Feature/
│   ├── .env.example
│   ├── Dockerfile
│   ├── docker/
│   │   └── supervisord.conf          # Cau hinh Supervisor (PHP-FPM + Queue Worker)
│   ├── composer.json
│   └── README.md
│
├── ai-service/                       # Python 3.10+ + FastAPI
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── recommendation.py
│   │   │       └── health.py
│   │   ├── schemas/                  # Pydantic request/response models
│   │   ├── services/                 # Logic xu ly AI (pre/post-processing)
│   │   ├── models/                   # Load & quan ly model AI
│   │   │   └── weights/              # File trong so model (hoac tro toi storage ngoai)
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── redis_client.py
│   │   └── main.py
│   ├── tests/
│   ├── .env.example
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
│
├── nginx/                            # Reverse proxy chinh (only entry)
│   ├── conf.d/
│   │   ├── default.conf              # Route "/" -> frontend, "/api" -> backend
│   │   └── ssl.conf
│   ├── certbot/
│   │   ├── conf/                     # Chung chi SSL (volume mount)
│   │   └── www/                      # Webroot cho Let's Encrypt challenge
│   └── Dockerfile
│
├── scripts/
│   ├── deploy.sh                     # Script deploy tong (pull, build, migrate, restart)
│   ├── backup-db.sh
│   └── init-letsencrypt.sh
│
├── docker-compose.yml                 # Compose chinh (production)
├── docker-compose.override.yml        # Override cho moi truong dev (hot-reload, mount volume)
├── docker-compose.staging.yml         # (tuy chon) cau hinh rieng staging
├── .env.example                       # Bien moi truong dung chung o cap root (neu can)
├── .gitignore
├── LICENSE
└── README.md                          # Huong dan tong quan chay toan bo he thong
```

---

## GHI CHU NHANH

| Thư mục | Chủ sở hữu | Không được commit |
|---|---|---|
| `frontend/` | Frontend Developer | `node_modules/`, `dist/`, `.env` thật |
| `backend/` | Backend Developer | `vendor/`, `.env` thật, `storage/*.key` |
| `ai-service/` | AI Engineer | `venv/`, `__pycache__/`, file model quá lớn (dùng Git LFS hoặc storage ngoài) |
| `nginx/certbot/conf/` | DevOps chung | Chứng chỉ SSL thật (chỉ generate ở server) |
| `docs/` | Cả team | Không loại trừ, luôn cập nhật |

Mỗi thư mục cấp 1 (`frontend/`, `backend/`, `ai-service/`) nên có `.gitignore` riêng phù hợp với ngôn ngữ/framework của mình, ngoài `.gitignore` chung ở root.
