<?php

namespace Database\Factories;

use App\Models\Todo;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class TodoFactory extends Factory
{
    protected $model = Todo::class;

    public function definition(): array
    {
        $scope = $this->faker->randomElement(['general', 'room']);

        return [
            'id' => (string) Str::uuid(),
            'title' => $this->faker->sentence(4),
            'scope' => $scope,
            'room' => $scope === 'room' ? $this->faker->randomElement([
                'Bad',
                'Schlafzimmer',
                'Kinderzimmer',
                'Wohnzimmer',
                'Küche',
                'Eingang & Treppen',
                'Hauswirtschaftsraum',
                'Technik',
            ]) : null,
            'notes' => $this->faker->optional()->sentence(),
            'completed' => $this->faker->boolean(40),
        ];
    }
}
