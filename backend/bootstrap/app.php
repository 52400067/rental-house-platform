<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Middleware\RequestId;
use App\Support\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__ . '/../routes/api.php',
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Register RequestId middleware globally (runs on every request)
        $middleware->append(RequestId::class);

        // Sanctum SPA stateful middleware on the 'web' group
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {

        // Only handle as JSON if the client wants JSON (API requests)
        $exceptions->shouldRenderJsonWhen(
            fn(Request $request, \Throwable $e): bool => $request->expectsJson()
        );

        // ─── ValidationException → 422 VALIDATION_ERROR ────────────────────
        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->expectsJson()) {
                return null;
            }
            return ApiResponse::error(
                code: ErrorCode::VALIDATION_ERROR->value,
                message: 'Dữ liệu không hợp lệ',
                status: 422,
                details: $e->errors(),
                request: $request,
            );
        });

        // ─── AuthenticationException → 401 UNAUTHENTICATED ─────────────────
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->expectsJson()) {
                return null;
            }
            return ApiResponse::error(
                code: ErrorCode::UNAUTHENTICATED->value,
                message: 'Chưa đăng nhập hoặc phiên đã hết hạn.',
                status: 401,
                request: $request,
            );
        });

        // ─── AuthorizationException → 403 FORBIDDEN ─────────────────────────
        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if (! $request->expectsJson()) {
                return null;
            }
            return ApiResponse::error(
                code: ErrorCode::FORBIDDEN->value,
                message: 'Bạn không có quyền thực hiện hành động này.',
                status: 403,
                request: $request,
            );
        });

        // ─── ModelNotFoundException / NotFoundHttpException → 404 NOT_FOUND ─
        $exceptions->render(function (ModelNotFoundException $e, Request $request) {
            if (! $request->expectsJson()) {
                return null;
            }
            return ApiResponse::error(
                code: ErrorCode::NOT_FOUND->value,
                message: 'Không tìm thấy tài nguyên yêu cầu.',
                status: 404,
                request: $request,
            );
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if (! $request->expectsJson()) {
                return null;
            }
            return ApiResponse::error(
                code: ErrorCode::NOT_FOUND->value,
                message: 'Không tìm thấy tài nguyên yêu cầu.',
                status: 404,
                request: $request,
            );
        });

        // ─── MethodNotAllowedHttpException → 404 NOT_FOUND ──────────────────
        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            if (! $request->expectsJson()) {
                return null;
            }
            return ApiResponse::error(
                code: ErrorCode::NOT_FOUND->value,
                message: 'Không tìm thấy tài nguyên yêu cầu.',
                status: 404,
                request: $request,
            );
        });

        // ─── TokenMismatchException → 419 CSRF_MISMATCH ─────────────────────
        $exceptions->render(function (TokenMismatchException $e, Request $request) {
            if (! $request->expectsJson()) {
                return null;
            }
            return ApiResponse::error(
                code: ErrorCode::CSRF_MISMATCH->value,
                message: 'CSRF token không hợp lệ hoặc đã hết hạn.',
                status: 419,
                request: $request,
            );
        });

        // ─── ThrottleRequestsException → 429 TOO_MANY_REQUESTS ─────────────
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if (! $request->expectsJson()) {
                return null;
            }
            $response = ApiResponse::error(
                code: ErrorCode::TOO_MANY_REQUESTS->value,
                message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                status: 429,
                request: $request,
            );
            // Preserve Retry-After header as required by API contract
            if ($retryAfter = $e->getHeaders()['Retry-After'] ?? null) {
                $response->headers->set('Retry-After', (string) $retryAfter);
            }
            return $response;
        });

        // ─── ApiException (business logic errors) ───────────────────────────
        $exceptions->render(function (ApiException $e, Request $request) {
            if (! $request->expectsJson()) {
                return null;
            }
            $details = $e->getDetails();
            return ApiResponse::error(
                code: $e->getErrorCode()->value,
                message: $e->getMessage(),
                status: $e->getHttpStatus(),
                details: $details ?: null,
                request: $request,
            );
        });

        // ─── Catch-all → 500 INTERNAL_ERROR ─────────────────────────────────
        $exceptions->render(function (\Throwable $e, Request $request) {
            if (! $request->expectsJson()) {
                return null;
            }
            $message = config('app.debug')
                ? $e->getMessage()
                : 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.';

            return ApiResponse::error(
                code: ErrorCode::INTERNAL_ERROR->value,
                message: $message,
                status: 500,
                request: $request,
            );
        });
    })->create();
