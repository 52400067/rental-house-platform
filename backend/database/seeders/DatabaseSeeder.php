<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            DistrictSeeder::class,
            SchoolSeeder::class,
            AmenitySeeder::class,
            UserSeeder::class,
            ListingSeeder::class,
            ConversationSeeder::class,
            ReviewSeeder::class,
        ]);
    }
}
