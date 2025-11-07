<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class TodoController extends Controller
{
    public function index()
    {
        return Todo::orderBy('created_at', 'desc')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'scope' => ['required', 'in:general,room'],
            'room' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validated['scope'] === 'room' && empty(trim((string) ($validated['room'] ?? '')))) {
            $validated['room'] = 'Unbenannter Raum';
        }

        $todo = Todo::create([
            'id' => (string) Str::uuid(),
            'title' => $validated['title'],
            'scope' => $validated['scope'],
            'room' => $validated['scope'] === 'room' ? $validated['room'] : null,
            'notes' => $validated['notes'] ?? null,
            'completed' => false,
        ]);

        return response()->json($todo, Response::HTTP_CREATED);
    }

    public function update(Request $request, Todo $todo)
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'scope' => ['sometimes', 'in:general,room'],
            'room' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'completed' => ['nullable', 'boolean'],
        ]);

        if (($validated['scope'] ?? $todo->scope) === 'room') {
            $validated['room'] = $validated['room'] ?? $todo->room ?? 'Unbenannter Raum';
        } else {
            $validated['room'] = null;
        }

        $todo->fill($validated);
        $todo->save();

        return $todo->refresh();
    }

    public function destroy(Todo $todo)
    {
        $todo->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
