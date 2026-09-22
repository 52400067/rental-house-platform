<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Ward;
use Illuminate\Database\Seeder;

class WardSeeder extends Seeder
{
    public function run(): void
    {
        // Phường/xã mẫu theo mô hình chính quyền 2 cấp, chia theo 12 thành phố
        // có nhiều sinh viên nhất. Tên hiển thị không cần hậu tố tỉnh/thành
        // vì dropdown đã nhóm theo Tỉnh/TP. Tọa độ là tâm khu vực, gần đúng.
        $wardsByCity = [
            'Hà Nội' => [
                ['name' => 'Phường Bách Khoa',  'latitude' => 20.9968, 'longitude' => 105.8365],
                ['name' => 'Phường Cầu Giấy',   'latitude' => 21.0283, 'longitude' => 105.7990],
                ['name' => 'Phường Trúc Bạch',  'latitude' => 21.0414, 'longitude' => 105.8340],
                ['name' => 'Phường Hàng Bài',   'latitude' => 21.0150, 'longitude' => 105.8490],
            ],
            'TP.HCM' => [
                ['name' => 'Phường Bến Nghé',   'latitude' => 10.7766, 'longitude' => 106.7009],
                ['name' => 'Phường Bình Thạnh', 'latitude' => 10.8014, 'longitude' => 106.7120],
                ['name' => 'Phường Thảo Điền',  'latitude' => 10.8050, 'longitude' => 106.7450],
                ['name' => 'Phường Linh Đông',  'latitude' => 10.8580, 'longitude' => 106.7610],
                ['name' => 'Phường Tân Phong',  'latitude' => 10.7355, 'longitude' => 106.7180],
            ],
            'Hải Phòng' => [
                ['name' => 'Phường Máy Tơ',     'latitude' => 20.8680, 'longitude' => 106.6820],
                ['name' => 'Phường Cầu Đất',    'latitude' => 20.8560, 'longitude' => 106.6900],
            ],
            'Đà Nẵng' => [
                ['name' => 'Phường An Hải',     'latitude' => 16.0718, 'longitude' => 108.2400],
                ['name' => 'Phường Thanh Khê',  'latitude' => 16.0500, 'longitude' => 108.2000],
            ],
            'Huế' => [
                ['name' => 'Phường Vĩnh Ninh',  'latitude' => 16.4560, 'longitude' => 107.5940],
            ],
            'Cần Thơ' => [
                ['name' => 'Phường An Bình',    'latitude' => 10.0300, 'longitude' => 105.7620],
                ['name' => 'Phường Cái Khế',    'latitude' => 10.0310, 'longitude' => 105.7820],
            ],
            'Thái Nguyên' => [
                ['name' => 'Phường Quang Vinh', 'latitude' => 21.5940, 'longitude' => 105.8360],
            ],
            'Thanh Hóa' => [
                ['name' => 'Phường Đông Cương', 'latitude' => 19.8230, 'longitude' => 105.7800],
            ],
            'Nghệ An' => [
                ['name' => 'Xã Cầu Giát',       'latitude' => 18.6800, 'longitude' => 105.6800],
            ],
            'Gia Lai' => [
                ['name' => 'Phường Quy Nhơn Đông', 'latitude' => 13.7750, 'longitude' => 109.2200],
            ],
            'Khánh Hòa' => [
                ['name' => 'Phường Xương Huân', 'latitude' => 12.2400, 'longitude' => 109.1950],
            ],
            'Lâm Đồng' => [
                ['name' => 'Phường 1',          'latitude' => 11.9404, 'longitude' => 108.4580],
            ],
        ];

        foreach ($wardsByCity as $cityName => $wards) {
            $city = City::where('name', $cityName)->firstOrFail();

            foreach ($wards as $ward) {
                Ward::create($ward + ['city_id' => $city->id]);
            }
        }
    }
}
