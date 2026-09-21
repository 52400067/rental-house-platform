<?php

namespace Database\Factories;

use App\Models\Ward;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Ward>
 */
class WardFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->city().' Ward',
            'latitude' => fake()->latitude(10.70, 10.90),
            'longitude' => fake()->longitude(106.60, 106.85),
        ];
    }
}
