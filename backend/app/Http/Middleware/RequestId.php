<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class RequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        // Use existing header or generate a new UUID
        $requestId = $request->header('X-Request-ID');

        if (! $requestId || ! is_string($requestId)) {
            $requestId = (string) Str::uuid();
            $request->headers->set('X-Request-ID', $requestId);
        }

        // Inject into log context for all subsequent log calls
        Log::withContext(['request_id' => $requestId]);

        /** @var Response $response */
        $response = $next($request);

        // Always echo the request_id back in the response header
        $response->headers->set('X-Request-ID', $requestId);

        return $response;
    }
}
