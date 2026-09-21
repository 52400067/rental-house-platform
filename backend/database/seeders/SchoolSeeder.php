<?php

namespace Database\Seeders;

use App\Models\School;
use Illuminate\Database\Seeder;

class SchoolSeeder extends Seeder
{
    public function run(): void
    {
        $schools = [
            ['name' => 'ĐHQG TP.HCM',            'latitude' => 10.8700, 'longitude' => 106.8030],
            ['name' => 'ĐH Bách Khoa',           'latitude' => 10.7723, 'longitude' => 106.6603],
            ['name' => 'ĐH Sư phạm Kỹ thuật',    'latitude' => 10.8506, 'longitude' => 106.7719],
        ];

        foreach ($schools as $school) {
            School::create($school);
        }
    }
}
