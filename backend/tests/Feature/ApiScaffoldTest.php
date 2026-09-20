<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ErrorCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiScaffoldTest extends TestCase
{
    // ─── (a) /api/v1/ping returns correct success structure ──────────────────

    public function test_ping_returns_success_structure(): void
    {
        $response = $this->getJson('/api/v1/ping');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data'    => ['status' => 'ok'],
            ])
            ->assertJsonStructure(['success', 'data' => ['status']]);
    }

    // ─── (b) Unknown endpoint returns 404 NOT_FOUND with correct structure ───

    public function test_not_found_endpoint_returns_404_not_found_structure(): void
    {
        $response = $this->getJson('/api/v1/this-does-not-exist');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'error'   => ['code' => ErrorCode::NOT_FOUND->value],
            ])
            ->assertJsonStructure(['success', 'error' => ['code', 'message'], 'request_id']);
    }

    // ─── (c) Validation error returns 422 with details per field ─────────────

    public function test_validation_error_returns_422_with_details(): void
    {
        // Use a temporary test route that triggers validation
        // We'll POST to a non-existing route – that gives 404, not 422.
        // Instead we test via a crafted route registered in the test itself.
        $this->app['router']->post('/test-validation', function () {
            request()->validate([
                'email' => ['required', 'email'],
                'name'  => ['required', 'min:3'],
            ]);
        });

        $response = $this->postJson('/test-validation', [
            'email' => 'not-an-email',
            // name missing
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error'   => ['code' => ErrorCode::VALIDATION_ERROR->value],
            ])
            ->assertJsonStructure([
                'success',
                'error' => ['code', 'message', 'details'],
                'request_id',
            ]);

        // details must be keyed by field name
        $response->assertJsonPath('error.details.email.0', fn($msg) => is_string($msg));
        $response->assertJsonPath('error.details.name.0', fn($msg) => is_string($msg));
    }

    // ─── (d) All error responses contain request_id ──────────────────────────

    public function test_all_error_responses_contain_request_id(): void
    {
        // 404 error must have request_id
        $r1 = $this->getJson('/api/v1/does-not-exist');
        $r1->assertJsonStructure(['request_id']);
        $this->assertNotEmpty($r1->json('request_id'));

        // 422 error must have request_id
        $this->app['router']->post('/test-validation2', function () {
            request()->validate(['field' => ['required']]);
        });
        $r2 = $this->postJson('/test-validation2', []);
        $r2->assertJsonStructure(['request_id']);
        $this->assertNotEmpty($r2->json('request_id'));
    }

    // ─── X-Request-ID header is echoed back in response ──────────────────────

    public function test_request_id_header_is_echoed_back(): void
    {
        $id = 'test-uuid-1234-abcd-efgh';

        $response = $this->withHeader('X-Request-ID', $id)
            ->getJson('/api/v1/ping');

        $response->assertHeader('X-Request-ID', $id);
    }

    public function test_request_id_is_generated_when_not_provided(): void
    {
        $response = $this->getJson('/api/v1/ping');

        // Header should be present even if we didn't send one
        $this->assertNotEmpty($response->headers->get('X-Request-ID'));
    }
}
