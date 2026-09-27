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
 * CSP is ENFORCING and chosen by response type:
 *  - a response that already carries a policy is left alone (the storage
 *    "serve" route sandboxes streamed files);
 *  - HTML (only the decorative welcome view) gets a tuned policy that keeps
 *    its inline styles, bunny.net fonts and laravel.com artwork working;
 *  - everything else (JSON API payloads, redirects, ...) gets
 *    `default-src 'none'` - a body no document should ever load from.
 */
class SecurityHeaders
{
    private const STRICT_POLICY = "default-src 'none'; frame-ancestors 'none'";

    private const HTML_POLICY = "default-src 'none'; "
        ."style-src 'unsafe-inline' https://fonts.bunny.net; "
        .'font-src https://fonts.bunny.net; '
        .'img-src https://laravel.com; '
        ."base-uri 'none'; frame-ancestors 'none'";

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('X-Frame-Options', 'DENY');

        if (! $response->headers->has('Content-Security-Policy')) {
            $response->headers->set('Content-Security-Policy', $this->policyFor($response));
        }

        return $response;
    }

    private function policyFor(Response $response): string
    {
        $type = (string) $response->headers->get('Content-Type');

        if (str_contains($type, 'text/html')) {
            return self::HTML_POLICY;
        }

        return self::STRICT_POLICY;
    }
}
