<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\School;
use Illuminate\Database\Seeder;

class SchoolSeeder extends Seeder
{
    public function run(): void
    {
        // Các trường ĐH lớn ở 10 thành phố nhiều sinh viên nhất,
        // mỗi trường thuộc một Tỉnh/TP để lọc cascade.
        $schoolsByCity = [
            'Hà Nội' => [
                ['name' => 'ĐH Bách Khoa Hà Nội',  'latitude' => 21.0056, 'longitude' => 105.8339],
                ['name' => 'ĐHQG Hà Nội',          'latitude' => 21.0367, 'longitude' => 105.8062],
                ['name' => 'ĐH Kinh tế Quốc dân',  'latitude' => 20.9929, 'longitude' => 105.8441],
            ],
            'TP.HCM' => [
                ['name' => 'ĐHQG TP.HCM',          'latitude' => 10.8700, 'longitude' => 106.8030],
                ['name' => 'ĐH Bách Khoa TP.HCM',  'latitude' => 10.7723, 'longitude' => 106.6603],
                ['name' => 'ĐH Kinh tế TP.HCM',    'latitude' => 10.7795, 'longitude' => 106.6950],
                ['name' => 'ĐH Tôn Đức Thắng',     'latitude' => 10.7305, 'longitude' => 106.7176],
            ],
            'Hải Phòng' => [
                ['name' => 'ĐH Hàng Hải',          'latitude' => 20.8210, 'longitude' => 106.7720],
            ],
            'Đà Nẵng' => [
                ['name' => 'ĐH Bách Khoa Đà Nẵng', 'latitude' => 16.0700, 'longitude' => 108.2280],
                ['name' => 'ĐH Kinh tế Đà Nẵng',   'latitude' => 16.0570, 'longitude' => 108.2430],
            ],
            'Huế' => [
                ['name' => 'ĐH Huế',               'latitude' => 16.4560, 'longitude' => 107.5930],
            ],
            'Cần Thơ' => [
                ['name' => 'ĐH Cần Thơ',           'latitude' => 10.0317, 'longitude' => 105.7700],
            ],
            'Thái Nguyên' => [
                ['name' => 'ĐH Thái Nguyên',       'latitude' => 21.5940, 'longitude' => 105.8370],
            ],
            'Nghệ An' => [
                ['name' => 'ĐH Vinh',              'latitude' => 18.6780, 'longitude' => 105.6820],
            ],
            'Gia Lai' => [
                ['name' => 'ĐH Quy Nhơn',          'latitude' => 13.7750, 'longitude' => 109.2160],
            ],
            'Khánh Hòa' => [
                ['name' => 'ĐH Nha Trang',         'latitude' => 12.2340, 'longitude' => 109.1950],
            ],
        ];

        foreach ($schoolsByCity as $cityName => $schools) {
            $city = City::where('name', $cityName)->firstOrFail();

            foreach ($schools as $school) {
                School::create($school + ['city_id' => $city->id]);
            }
        }
    }
}
