<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Enums\ErrorCode;
use Exception;

class ApiException extends Exception
{
    public function __construct(
        private readonly ErrorCode $errorCode,
        private readonly int $httpStatus,
        string $message = '',
        private readonly array $details = [],
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public function getErrorCode(): ErrorCode
    {
        return $this->errorCode;
    }

    public function getHttpStatus(): int
    {
        return $this->httpStatus;
    }

    public function getDetails(): array
    {
        return $this->details;
    }
}
