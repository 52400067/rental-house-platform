<?php

namespace Database\Seeders;

use App\Models\Ward;
use Illuminate\Database\Seeder;

class WardSeeder extends Seeder
{
    public function run(): void
    {
        // Dữ liệu mẫu trải khắp Việt Nam (điểm đến sinh viên lớn).
        // Tên phường/xã gần đúng theo mô hình chính quyền 2 cấp (từ
        // 01/07/2025 không còn quận/huyện) - tọa độ giữ nguyên tâm khu
        // vực cũ để demo khoảng cách.
        $wards = [
            // Hà Nội
            ['name' => 'Phường Bách Khoa, Hà Nội',       'latitude' => 20.9968, 'longitude' => 105.8365],
            ['name' => 'Phường Cầu Giấy, Hà Nội',        'latitude' => 21.0283, 'longitude' => 105.7990],
            ['name' => 'Phường Trúc Bạch, Hà Nội',       'latitude' => 21.0414, 'longitude' => 105.8340],
            ['name' => 'Phường Hàng Bài, Hà Nội',        'latitude' => 21.0150, 'longitude' => 105.8490],
            // TP.HCM
            ['name' => 'Phường Bến Nghé, TP.HCM',        'latitude' => 10.7766, 'longitude' => 106.7009],
            ['name' => 'Phường Bình Thạnh, TP.HCM',      'latitude' => 10.8014, 'longitude' => 106.7120],
            ['name' => 'Phường Thảo Điền, TP.HCM',       'latitude' => 10.8050, 'longitude' => 106.7450],
            ['name' => 'Phường Linh Đông, TP.HCM',       'latitude' => 10.8580, 'longitude' => 106.7610],
            // Đà Nẵng
            ['name' => 'Phường An Hải, Đà Nẵng',         'latitude' => 16.0718, 'longitude' => 108.2400],
            ['name' => 'Phường Thanh Khê, Đà Nẵng',      'latitude' => 16.0500, 'longitude' => 108.2000],
            // Cần Thơ
            ['name' => 'Phường An Bình, Cần Thơ',        'latitude' => 10.0300, 'longitude' => 105.7620],
            ['name' => 'Phường Cái Khế, Cần Thơ',        'latitude' => 10.0310, 'longitude' => 105.7820],
            // Các thành phố khác
            ['name' => 'Phường Vĩnh Ninh, Huế',          'latitude' => 16.4560, 'longitude' => 107.5940],
            ['name' => 'Phường Xương Huân, Nha Trang',   'latitude' => 12.2400, 'longitude' => 109.1950],
            ['name' => 'Phường Quy Nhơn Đông, Quy Nhơn', 'latitude' => 13.7750, 'longitude' => 109.2200],
            ['name' => 'Xã Cầu Giát, Nghệ An',           'latitude' => 18.6800, 'longitude' => 105.6800],
        ];

        foreach ($wards as $ward) {
            Ward::create($ward);
        }
    }
}
