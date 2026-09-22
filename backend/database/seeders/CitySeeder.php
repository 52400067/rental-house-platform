<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    public function run(): void
    {
        // Đủ 34 đơn vị hành chính cấp tỉnh theo Nghị quyết 202/2025/QH15
        // (hiệu lực 12/6/2025): 6 thành phố trực thuộc TW + 28 tỉnh.
        // Tọa độ là tâm khu vực hành chính, gần đúng để demo bản đồ.
        $cities = [
            // 6 thành phố trực thuộc TW (đặt trước để hiện đầu dropdown)
            ['name' => 'Hà Nội',    'type' => City::TYPE_CITY,     'latitude' => 21.0285, 'longitude' => 105.8542],
            ['name' => 'TP.HCM',    'type' => City::TYPE_CITY,     'latitude' => 10.7769, 'longitude' => 106.7009],
            ['name' => 'Hải Phòng', 'type' => City::TYPE_CITY,     'latitude' => 20.8654, 'longitude' => 106.6843],
            ['name' => 'Đà Nẵng',   'type' => City::TYPE_CITY,     'latitude' => 16.0545, 'longitude' => 108.2022],
            ['name' => 'Huế',       'type' => City::TYPE_CITY,     'latitude' => 16.4637, 'longitude' => 107.5909],
            ['name' => 'Cần Thơ',   'type' => City::TYPE_CITY,     'latitude' => 10.0452, 'longitude' => 105.7469],

            // 28 tỉnh (19 tỉnh mới sáp nhập + 9 tỉnh không sắp xếp)
            ['name' => 'Tuyên Quang', 'type' => City::TYPE_PROVINCE, 'latitude' => 21.8832, 'longitude' => 105.2211],
            ['name' => 'Lào Cai',     'type' => City::TYPE_PROVINCE, 'latitude' => 22.4850, 'longitude' => 103.9700],
            ['name' => 'Thái Nguyên', 'type' => City::TYPE_PROVINCE, 'latitude' => 21.5943, 'longitude' => 105.8481],
            ['name' => 'Phú Thọ',     'type' => City::TYPE_PROVINCE, 'latitude' => 21.3228, 'longitude' => 105.4020],
            ['name' => 'Bắc Ninh',    'type' => City::TYPE_PROVINCE, 'latitude' => 21.1860, 'longitude' => 106.0763],
            ['name' => 'Hưng Yên',    'type' => City::TYPE_PROVINCE, 'latitude' => 20.6464, 'longitude' => 106.0514],
            ['name' => 'Ninh Bình',   'type' => City::TYPE_PROVINCE, 'latitude' => 20.2506, 'longitude' => 105.9744],
            ['name' => 'Quảng Ninh',  'type' => City::TYPE_PROVINCE, 'latitude' => 21.0069, 'longitude' => 107.2925],
            ['name' => 'Thanh Hóa',   'type' => City::TYPE_PROVINCE, 'latitude' => 19.8067, 'longitude' => 105.7853],
            ['name' => 'Nghệ An',     'type' => City::TYPE_PROVINCE, 'latitude' => 18.6796, 'longitude' => 105.6813],
            ['name' => 'Hà Tĩnh',     'type' => City::TYPE_PROVINCE, 'latitude' => 18.3434, 'longitude' => 105.9063],
            ['name' => 'Quảng Trị',   'type' => City::TYPE_PROVINCE, 'latitude' => 17.1134, 'longitude' => 106.6640],
            ['name' => 'Quảng Ngãi',  'type' => City::TYPE_PROVINCE, 'latitude' => 15.1200, 'longitude' => 108.7925],
            ['name' => 'Gia Lai',     'type' => City::TYPE_PROVINCE, 'latitude' => 13.7750, 'longitude' => 109.2200],
            ['name' => 'Khánh Hòa',   'type' => City::TYPE_PROVINCE, 'latitude' => 12.2400, 'longitude' => 109.1950],
            ['name' => 'Lâm Đồng',    'type' => City::TYPE_PROVINCE, 'latitude' => 11.9400, 'longitude' => 108.4400],
            ['name' => 'Đắk Lắk',     'type' => City::TYPE_PROVINCE, 'latitude' => 12.7100, 'longitude' => 108.2380],
            ['name' => 'Đồng Nai',    'type' => City::TYPE_PROVINCE, 'latitude' => 10.9450, 'longitude' => 106.8240],
            ['name' => 'Tây Ninh',    'type' => City::TYPE_PROVINCE, 'latitude' => 11.3100, 'longitude' => 106.0980],
            ['name' => 'An Giang',    'type' => City::TYPE_PROVINCE, 'latitude' => 10.3850, 'longitude' => 105.4360],
            ['name' => 'Đồng Tháp',   'type' => City::TYPE_PROVINCE, 'latitude' => 10.4540, 'longitude' => 105.6330],
            ['name' => 'Vĩnh Long',   'type' => City::TYPE_PROVINCE, 'latitude' => 10.2530, 'longitude' => 105.9720],
            ['name' => 'Cà Mau',      'type' => City::TYPE_PROVINCE, 'latitude' => 9.1770,  'longitude' => 105.1500],
            ['name' => 'Lạng Sơn',    'type' => City::TYPE_PROVINCE, 'latitude' => 21.8530, 'longitude' => 106.7610],
            ['name' => 'Cao Bằng',    'type' => City::TYPE_PROVINCE, 'latitude' => 22.6650, 'longitude' => 106.2580],
            ['name' => 'Điện Biên',   'type' => City::TYPE_PROVINCE, 'latitude' => 21.3860, 'longitude' => 103.0170],
            ['name' => 'Lai Châu',    'type' => City::TYPE_PROVINCE, 'latitude' => 22.3960, 'longitude' => 103.4580],
            ['name' => 'Sơn La',      'type' => City::TYPE_PROVINCE, 'latitude' => 21.3280, 'longitude' => 103.9140],
        ];

        foreach ($cities as $city) {
            City::create($city);
        }
    }
}
