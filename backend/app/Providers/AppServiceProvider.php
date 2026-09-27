<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // PROMPTS.md step 10: surface N+1 queries as exceptions in dev/test.
        Model::preventLazyLoading(! app()->isProduction());

        // Fail fast on unsafe production configuration (Phase 4 hardening):
        // a prod deploy with APP_DEBUG=true leaks stack traces, env values and
        // file paths to anyone who can trigger an error, and an empty APP_KEY
        // breaks signed URL authorization (attachment links become forgeable).
        // Better to refuse boot than to run silently misconfigured.
        if (app()->environment('production')) {
            if ((bool) config('app.debug')) {
                throw new \RuntimeException('APP_DEBUG must be false in production.');
            }

            if (config('app.key') === null || config('app.key') === '') {
                throw new \RuntimeException('APP_KEY must be set in production.');
            }
        }
    }
}
