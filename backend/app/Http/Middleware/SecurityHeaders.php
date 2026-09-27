<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Security response headers on EVERY response (Phase 4 hardening).
 *
 * Appended to the global middleware stack (after the route ran) so API
 * responses, served storage files and health probes all carry the same
 * minimum set. Error responses rendered by the exception handler bypass
 * middleware post-processing, but those carry no attacker-controlled
 * content, so the exposure is negligible.
 *
 * CSP is REPORT-ONLY: this is a JSON API - no HTML is rendered here - and
 * signed attachment links are opened directly in a browser tab. Flip to
 * enforcing Content-Security-Policy once reports confirm nothing breaks.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Content-Security-Policy-Report-Only', "default-src 'none'");

        return $response;
    }
}
