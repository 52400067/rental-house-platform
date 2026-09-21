<?php

namespace Database\Seeders;

use App\Models\Ward;
use Illuminate\Database\Seeder;

class WardSeeder extends Seeder
{
    public function run(): void
    {
        // Approximate HCMC data (ERD §5).
        // Tên phường theo mô hình chính quyền 2 cấp (từ 01/07/2025 không còn
        // quận/huyện) - tọa độ giữ nguyên tâm khu vực cũ để demo khoảng cách.
        $wards = [
            ['name' => 'Phường Thủ Đức',     'latitude' => 10.8494, 'longitude' => 106.7537],
            ['name' => 'Phường Gò Vấp',      'latitude' => 10.8386, 'longitude' => 106.6652],
            ['name' => 'Phường Bình Thạnh',  'latitude' => 10.8106, 'longitude' => 106.7091],
            ['name' => 'Phường 10',          'latitude' => 10.7746, 'longitude' => 106.6667],
            ['name' => 'Phường Tân Bình',    'latitude' => 10.8014, 'longitude' => 106.6526],
        ];

        foreach ($wards as $ward) {
            Ward::create($ward);
        }
    }
}
