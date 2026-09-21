<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SeedAndRelationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seed_command_runs_without_errors(): void
    {
        $this->artisan('db:seed', ['--force' => true])->assertExitCode(0);

        $this->assertDatabaseCount('users', 13);
        $this->assertDatabaseCount('listings', 30);
        // Sample image files need GD (bundled in the Docker image); without GD
        // the seeder still seeds everything except the picture files.
        $this->assertDatabaseCount('listing_images', extension_loaded('gd') ? 30 : 0);
        $this->assertDatabaseCount('conversations', 6);
        $this->assertDatabaseCount('reviews', 4);

        // Demo accounts exist with the shared password.
        $student = User::where('email', 'student1@example.com')->first();
        $landlord = User::where('email', 'landlord1@example.com')->first();
        $this->assertNotNull($student, 'student1@example.com must exist');
        $this->assertNotNull($landlord, 'landlord1@example.com must exist');
        $this->assertTrue(Hash::check('password', $student->password));
        $this->assertTrue(Hash::check('password', $landlord->password));

        // Seeded prices stay in the 1.5M..6M VND range.
        $this->assertTrue(Listing::whereBetween('price', [1_500_000, 6_000_000])->count() === 30);
    }

    public function test_listing_district_and_amenity_relations_work(): void
    {
        $this->seed();

        $listing = Listing::has('amenities')->first();

        $this->assertNotNull($listing->district);
        $this->assertDatabaseHas('districts', ['id' => $listing->district_id]);
        $this->assertGreaterThanOrEqual(3, $listing->amenities->count());
        $this->assertLessThanOrEqual(6, $listing->amenities->count());
        $this->assertSame($listing->user_id, $listing->landlord->id);
    }

    public function test_conversation_message_relation_works(): void
    {
        $this->seed();

        $conversation = Conversation::has('messages')->first();

        $this->assertGreaterThanOrEqual(1, $conversation->messages->count());
        $this->assertInstanceOf(Message::class, $conversation->messages->first());

        $message = $conversation->messages->first();
        $this->assertSame($conversation->id, $message->conversation->id);
        $this->assertContains($message->sender_id, [$conversation->student_id, $conversation->landlord_id]);
    }

    public function test_cover_image_is_image_with_smallest_id(): void
    {
        $this->seed();

        $listing = Listing::first();
        $listing->images()->delete();

        $listing->images()->createMany([
            ['path' => 'listings/test-b.jpg'],
            ['path' => 'listings/test-a.jpg'],
            ['path' => 'listings/test-c.jpg'],
        ]);

        // Cover = image with the smallest id, regardless of insertion order/path.
        $this->assertSame(
            $listing->images()->min('id'),
            $listing->coverImage->first()->id,
        );
    }

    public function test_reviews_are_backed_by_conversations(): void
    {
        $this->seed();

        // ERD rule: a student can only review a listing they have a conversation about.
        $orphanReviews = Review::whereNotExists(function ($query) {
            $query->selectRaw(1)
                ->from('conversations')
                ->whereColumn('conversations.student_id', 'reviews.student_id')
                ->whereColumn('conversations.listing_id', 'reviews.listing_id');
        })->count();

        $this->assertSame(0, $orphanReviews);
    }
}
