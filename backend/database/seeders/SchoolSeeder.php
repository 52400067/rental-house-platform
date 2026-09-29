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
        // mỗi trường thuộc một Tỉnh/TP để lọc cascade. Riêng TP.HCM dung
        // ten rut gon (HCMUT, UEH, TDTU...) de dropdown/filter gon gang.
        $schoolsByCity = [
            'Hà Nội' => [
                ['name' => 'ĐH Bách Khoa Hà Nội',  'latitude' => 21.0056, 'longitude' => 105.8339],
                ['name' => 'ĐHQG Hà Nội',          'latitude' => 21.0367, 'longitude' => 105.8062],
                ['name' => 'ĐH Kinh tế Quốc dân',  'latitude' => 20.9929, 'longitude' => 105.8441],
            ],
            'TP.HCM' => [
                ['name' => 'HCMUT',   'latitude' => 10.7721, 'longitude' => 106.6607],
                ['name' => 'HCMUS',   'latitude' => 10.7628, 'longitude' => 106.6824],
                ['name' => 'USSH',    'latitude' => 10.7877, 'longitude' => 106.7018],
                ['name' => 'HCMIU',   'latitude' => 10.8779, 'longitude' => 106.8019],
                ['name' => 'UIT',     'latitude' => 10.87, 'longitude' => 106.803],
                ['name' => 'UEL',     'latitude' => 10.8697, 'longitude' => 106.7781],
                ['name' => 'TDTU',    'latitude' => 10.7325, 'longitude' => 106.6996],
                ['name' => 'UEH',     'latitude' => 10.783, 'longitude' => 106.6953],
                ['name' => 'HUTECH',  'latitude' => 10.8018, 'longitude' => 106.7148],
                ['name' => 'VLU',     'latitude' => 10.8286, 'longitude' => 106.6787],
                ['name' => 'HCMUTE',  'latitude' => 10.8508, 'longitude' => 106.7721],
                ['name' => 'HCMUE',   'latitude' => 10.7616, 'longitude' => 106.6824],
                ['name' => 'UMP',     'latitude' => 10.7548, 'longitude' => 106.6636],
                ['name' => 'HCMULAW', 'latitude' => 10.7667, 'longitude' => 106.7038],
                ['name' => 'HUB',     'latitude' => 10.7736, 'longitude' => 106.7062],
                ['name' => 'NLU',     'latitude' => 10.8712, 'longitude' => 106.7913],
                ['name' => 'RMIT',    'latitude' => 10.7293, 'longitude' => 106.6935],
                ['name' => 'SGU',     'latitude' => 10.7599, 'longitude' => 106.682],
                ['name' => 'IUH',     'latitude' => 10.8219, 'longitude' => 106.6867],
                ['name' => 'HCMCOU',  'latitude' => 10.7803, 'longitude' => 106.6876],
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
