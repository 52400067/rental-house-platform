FROM php:8.3-cli-alpine

# libpng/jpeg/freetype are required for the GD extension (seeder sample images).
RUN apk add --no-cache libpq-dev icu-dev oniguruma-dev libzip-dev libpng-dev jpeg-dev freetype-dev \
    && docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install pdo_pgsql pgsql bcmath intl zip gd

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Dependencies first so they are cached between builds.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts

COPY . .

# Relative storage link so /storage URLs work behind APP_URL.
RUN php artisan storage:link --relative || true

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
