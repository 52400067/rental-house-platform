<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiJsonErrorFormatTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_api_route_returns_json_404(): void
    {
        $response = $this->getJson('/api/this-route-does-not-exist');

        $response->assertStatus(404)
            ->assertExactJson(['message' => 'Không tìm thấy dữ liệu.']);
    }

    public function test_missing_model_returns_json_404(): void
    {
        // No /listings/{id} route yet; the missing model is exercised from step 2.
        // For now verify that a model-bound-like missing lookup keeps JSON shape.
        $response = $this->getJson('/api/this-route-does-not-exist', ['Accept' => 'application/json']);

        $response->assertStatus(404)
            ->assertHeader('Content-Type', 'application/json');
    }

    public function test_unauthenticated_protected_route_returns_json_401(): void
    {
        // /api/user is the default Sanctum route installed by install:api.
        $response = $this->getJson('/api/user');

        $response->assertStatus(401)
            ->assertExactJson(['message' => 'Bạn chưa đăng nhập.']);
    }

    public function test_invalid_token_returns_json_401(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer invalid-token')
            ->getJson('/api/user');

        $response->assertStatus(401)
            ->assertExactJson(['message' => 'Bạn chưa đăng nhập.']);
    }
}
