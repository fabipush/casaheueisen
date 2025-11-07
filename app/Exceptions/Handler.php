<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Support\Facades\Config;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed for validation exceptions.
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    public function register(): void
    {
        //
    }

    public function render($request, Throwable $e)
    {
        $debug = Config::get('app.debug');

        if ($debug && !\function_exists('highlight_file')) {
            Config::set('app.debug', false);

            try {
                return parent::render($request, $e);
            } finally {
                Config::set('app.debug', $debug);
            }
        }

        return parent::render($request, $e);
    }
}
