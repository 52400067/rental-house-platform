<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ApiResponse
{
    /**
     * Get the request ID from the incoming request header,
     * or generate a new UUID if absent.
     */
    public static function requestId(?Request $request = null): string
    {
        $req = $request ?? request();
        $id  = $req->header('X-Request-ID');

        return ($id && is_string($id)) ? $id : (string) Str::uuid();
    }

    /**
     * Return a success response.
     *
     * @param  mixed  $data
     * @param  array<string, mixed>|null  $meta
     */
    public static function success(
        mixed $data = null,
        ?array $meta = null,
        ?string $message = null,
        int $status = 200,
    ): JsonResponse {
        $payload = ['success' => true, 'data' => $data];

        if ($meta !== null) {
            $payload['meta'] = $meta;
        }

        if ($message !== null) {
            $payload['message'] = $message;
        }

        return response()->json($payload, $status);
    }

    /**
     * Return an error response.
     *
     * @param  array<string, mixed>|null  $details
     */
    public static function error(
        string $code,
        string $message,
        int $status = 400,
        ?array $details = null,
        ?Request $request = null,
    ): JsonResponse {
        $error = [
            'code'    => $code,
            'message' => $message,
        ];

        if ($details !== null) {
            $error['details'] = $details;
        }

        $payload = [
            'success'    => false,
            'error'      => $error,
            'request_id' => self::requestId($request),
        ];

        return response()->json($payload, $status);
    }
}
