<?php

namespace Database\Seeders;

use App\Models\Amenity;
use App\Models\Listing;
use App\Models\ListingImage;
use App\Models\School;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\ImageManager;

class ListingSeeder extends Seeder
{
    public function run(): void
    {
        $landlords = User::where('role', User::ROLE_LANDLORD)->orderBy('id')->get();
        $wards = Ward::orderBy('id')->get();
        $amenityIds = Amenity::orderBy('id')->pluck('id')->all();
        $schools = School::orderBy('id')->get();

        // Clean previously seeded images so repeated fresh seeds don't accumulate files.
        Storage::disk('public')->delete(Storage::disk('public')->files('listings'));

        $manager = null;
        if (extension_loaded('gd')) {
            $manager = new ImageManager(new Driver); // GD driver
        } else {
            // Demo images need GD (available in the Docker image). Without it,
            // seeding continues but no sample picture files are generated.
            $this->command?->warn('PHP GD extension not available: seeding listings WITHOUT sample images.');
        }
        $typeLabels = [
            Listing::TYPE_ROOM => 'Phòng trọ',
            Listing::TYPE_APARTMENT => 'Căn hộ',
            Listing::TYPE_HOUSE => 'Nhà nguyên căn',
        ];
        $areasByType = [
            Listing::TYPE_ROOM => [12, 30],
            Listing::TYPE_APARTMENT => [35, 70],
            Listing::TYPE_HOUSE => [80, 150],
        ];

        for ($i = 1; $i <= 30; $i++) {
            $landlord = $landlords[($i - 1) % $landlords->count()];
            $ward = $wards[($i - 1) % $wards->count()];
            $type = array_keys($typeLabels)[($i - 1) % 3];

            [$minArea, $maxArea] = $areasByType[$type];
            $area = $minArea + mt_rand(0, ($maxArea - $minArea) * 2) / 2;
            $price = 1_500_000 + mt_rand(0, 45) * 100_000; // 1.5M .. 6M VND

            // Coordinates jittered around the ward center (~±1.3 km).
            // A few listings sit right next to a school near their ward so the
            // distance filter and map demo nicely across all seeded cities.
            if (in_array($i, [1, 4, 6, 9, 16, 21], true)) {
                $school = $this->nearestSchool($schools, $ward);
                $lat = (float) $school->latitude + mt_rand(-5, 5) / 10000;   // ~±0.5 km
                $lng = (float) $school->longitude + mt_rand(-5, 5) / 10000;
            } else {
                $lat = (float) $ward->latitude + mt_rand(-120, 120) / 10000;
                $lng = (float) $ward->longitude + mt_rand(-120, 120) / 10000;
            }

            $status = Listing::STATUS_AVAILABLE;
            if ($i > 27) {
                $status = Listing::STATUS_HIDDEN;
            } elseif ($i > 25) {
                $status = Listing::STATUS_RENTED;
            }

            $listing = Listing::create([
                'user_id' => $landlord->id,
                'ward_id' => $ward->id,
                'title' => sprintf('%s %s, %dm²', $typeLabels[$type], $ward->name, (int) $area),
                'description' => sprintf(
                    '%s tại %s, giá %s triệu/tháng. Giờ giấc tự do, an ninh tốt, phù hợp sinh viên.',
                    $typeLabels[$type], $ward->name, number_format($price / 1_000_000, 1)
                ),
                'type' => $type,
                'price' => $price,
                'area_m2' => $area,
                'address' => sprintf('Số %d, Đường số %d, %s', mt_rand(1, 200), mt_rand(1, 20), $ward->name),
                'latitude' => $lat,
                'longitude' => $lng,
                'status' => $status,
            ]);

            // 3 to 6 amenities per listing.
            $shuffled = $amenityIds;
            shuffle($shuffled);
            $listing->amenities()->attach(array_slice($shuffled, 0, mt_rand(3, 6)));

            if ($manager !== null) {
                $this->createSampleImage($manager, $listing, $i);
            }
        }
    }

    /** School whose coordinates are closest to the given ward. */
    private function nearestSchool($schools, Ward $ward): School
    {
        $best = null;
        $bestDist = PHP_FLOAT_MAX;
        foreach ($schools as $school) {
            $dLat = (float) $school->latitude - (float) $ward->latitude;
            $dLng = (float) $school->longitude - (float) $ward->longitude;
            $dist = $dLat * $dLat + $dLng * $dLng;
            if ($dist < $bestDist) {
                $bestDist = $dist;
                $best = $school;
            }
        }

        return $best;
    }

    /** Generate a simple colored JPG with text (GD), no Internet download. */
    private function createSampleImage(ImageManager $manager, Listing $listing, int $i): void
    {
        $backgrounds = ['#4A90D9', '#7FB77E', '#F4B942', '#E77F67', '#9B8BD4', '#5FB4A2'];
        $bg = $backgrounds[$i % count($backgrounds)];

        // GD's built-in font is ASCII-only, so the label has no diacritics.
        $label = sprintf('NHA TRO DEMO #%d - %.1f TRIEU', $i, $listing->price / 1_000_000);

        $image = $manager->createImage(640, 424)->fill($bg);

        $image->text($label, 320, 212, function ($font) {
            $font->size(5); // built-in GD font size (1-5)
            $font->color('#FFFFFF');
            $font->align('center', 'center');
        });

        $path = "listings/seed-{$i}.jpg";
        Storage::disk('public')->put($path, (string) $image->encode(new JpegEncoder(85)));

        ListingImage::create(['listing_id' => $listing->id, 'path' => $path]);
    }
}
