<?php

namespace Database\Seeders;

use App\Models\District;
use Illuminate\Database\Seeder;

class DistrictSeeder extends Seeder
{
    public function run(): void
    {
        // Approximate HCMC data (ERD §5).
        $districts = [
            ['name' => 'Thủ Đức',    'latitude' => 10.8494, 'longitude' => 106.7537],
            ['name' => 'Gò Vấp',     'latitude' => 10.8386, 'longitude' => 106.6652],
            ['name' => 'Bình Thạnh', 'latitude' => 10.8106, 'longitude' => 106.7091],
            ['name' => 'Quận 10',    'latitude' => 10.7746, 'longitude' => 106.6667],
            ['name' => 'Tân Bình',   'latitude' => 10.8014, 'longitude' => 106.6526],
        ];

        foreach ($districts as $district) {
            District::create($district);
        }
    }
}
