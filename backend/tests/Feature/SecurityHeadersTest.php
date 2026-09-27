<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 4 hardening: every response carries the minimum security header set
 * (global middleware append, bootstrap/app.php). CSP is report-only until
 * the demo stack proves nothing breaks.
 */
class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_probe_carries_security_headers(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Content-Security-Policy-Report-Only', "default-src 'none'");
    }

    public function test_public_reference_endpoints_carry_security_headers(): void
    {
        $this->getJson('/api/cities')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY');
    }
}
