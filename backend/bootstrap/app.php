<?php

use App\Exceptions\AiUnavailableException;
use App\Http\Middleware\AddRequestId;
use App\Http\Middleware\ApiThrottle;
use App\Http\Middleware\EnsureRole;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withBroadcasting(
        // The SPA authenticates with Sanctum PERSONAL ACCESS TOKENS (Bearer),
        // not the web cookie session, so /broadcasting/auth must run inside the
        // "api" middleware group with sanctum. The web group is kept as well so
        // default Laravel behavior still works if a session-based client appears.
        __DIR__.'/../routes/channels.php',
        ['middleware' => ['api', 'auth:sanctum']],
    )
    ->withMiddleware(function (Middleware $middleware) {
        // API-only app: no named "login" route exists, so the framework default
        // redirectGuestsTo(route('login')) throws RouteNotFoundException and turns
        // guest API requests (without Accept: application/json) into a 500 instead
        // of the contract's JSON 401. A closure returning null disables the redirect
        // so AuthenticationException reaches the JSON 401 handler below.
        $middleware->redirectGuestsTo(fn () => null);

        // Correlate every log line to a request: AddRequestId runs first in the
        // api group and shares request_id / user_id with all log channels.
        $middleware->api(prepend: [AddRequestId::class]);

        $middleware->alias([
            'role' => EnsureRole::class,
            'throttle.api' => ApiThrottle::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // All /api/* requests must always receive JSON errors (API_CONTRACT.md §1).
        $exceptions->shouldRenderJsonWhen(fn (Request $request, Throwable $e) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null; // Let non-API routes behave normally.
            }

            // 401 - not authenticated (auth:sanctum guard failures land here).
            if ($e instanceof AuthenticationException) {
                return new JsonResponse(['message' => 'Bạn chưa đăng nhập.'], 401);
            }

            // 403 - authenticated but forbidden (role middleware, policies).
            // Laravel converts AuthorizationException into AccessDeniedHttpException
            // via prepareException(), so both must be handled here.
            if ($e instanceof AuthorizationException
                || $e instanceof AccessDeniedHttpException) {
                return new JsonResponse(['message' => 'Bạn không có quyền thực hiện thao tác này.'], 403);
            }

            // 404 - missing route or missing model (Route model binding).
            if ($e instanceof NotFoundHttpException || $e instanceof ModelNotFoundException) {
                return new JsonResponse(['message' => 'Không tìm thấy dữ liệu.'], 404);
            }

            // 503 - AI service down (used by AiClient from step 9).
            if ($e instanceof AiUnavailableException) {
                return new JsonResponse(['message' => 'Dịch vụ AI tạm thời không khả dụng.'], 503);
            }

            // 422 - keep Laravel's default { message, errors } format untouched.
            if ($e instanceof ValidationException) {
                return null;
            }

            // 503/403-style aborts thrown by controllers keep their code and status text.
            if ($e instanceof HttpException) {
                if ($e->getStatusCode() === 503) {
                    return new JsonResponse(['message' => 'Dịch vụ AI tạm thời không khả dụng.'], 503);
                }

                return new JsonResponse(['message' => $e->getMessage() ?: 'Lỗi máy chủ.'], $e->getStatusCode());
            }

            // 500 - never leak internals when APP_DEBUG=false.
            return new JsonResponse(['message' => 'Lỗi máy chủ.'], 500);
        });
    })->create();
