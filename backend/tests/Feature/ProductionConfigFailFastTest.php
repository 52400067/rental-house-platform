<?php

namespace Tests\Feature;

use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

/**
 * Phase 4 hardening: production must refuse to boot with unsafe config.
 * APP_DEBUG=true leaks stack traces and env values; an empty APP_KEY makes
 * signed attachment URLs forgeable (the signature IS the authorization).
 * The provider re-runs boot() on a fresh instance - the exact production
 * decision path. environment() reads the app['env'] INSTANCE (set from
 * APP_ENV), not config('app.env'), so the tests set BOTH.
 */
class ProductionConfigFailFastTest extends TestCase
{
    private function forceEnvironment(string $environment): void
    {
        $this->app->detectEnvironment(fn () => $environment);
        Config::set('app.env', $environment);
    }

    public function test_debug_true_in_production_throws(): void
    {
        $this->forceEnvironment('production');
        Config::set('app.debug', true);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('APP_DEBUG must be false in production.');

        (new AppServiceProvider($this->app))->boot();
    }

    public function test_missing_app_key_in_production_throws(): void
    {
        $this->forceEnvironment('production');
        Config::set('app.debug', false);
        Config::set('app.key', '');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('APP_KEY must be set in production.');

        (new AppServiceProvider($this->app))->boot();
    }

    public function test_local_environment_keeps_debug_and_empty_key(): void
    {
        $this->forceEnvironment('local');
        Config::set('app.debug', true);
        Config::set('app.key', '');

        // Must NOT throw: local development legitimately runs without a key.
        (new AppServiceProvider($this->app))->boot();

        $this->assertTrue(config('app.debug'));
    }
}
