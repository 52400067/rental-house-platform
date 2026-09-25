FROM php:8.3-cli-alpine

# libpng/jpeg/freetype are required for the GD extension (seeder sample images).
# pcntl is required by Laravel Reverb (SIGINT/SIGTERM constants + signal
# handlers) and is NOT compiled into the alpine PHP images by default -
# without it "reverb:start" dies with "Undefined constant SIGINT".
RUN apk add --no-cache libpq-dev icu-dev oniguruma-dev libzip-dev libpng-dev jpeg-dev freetype-dev \
    && docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install pdo_pgsql pgsql bcmath intl zip gd pcntl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Dependencies first so they are cached between builds.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts

COPY . .

# bootstrap/cache must be empty here: .dockerignore excludes local *.php caches
# (they reference dev packages like laravel/pail and would crash every artisan
# command in a --no-dev image). Without this, artisan cannot even resolve providers.
RUN mkdir -p bootstrap/cache && rm -f bootstrap/cache/*.php

# Relative storage link so /storage URLs work behind APP_URL.
# No "|| true": a failure here must break the build, not hide a broken image.
RUN php artisan storage:link --relative --force

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
