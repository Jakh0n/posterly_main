"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/;
const MAX_COLORS = 6;

export interface PaletteEditorProps {
  value: string[];
  onChange: (palette: string[]) => void;
}

export function PaletteEditor({ value, onChange }: PaletteEditorProps) {
  const [draft, setDraft] = useState("#");
  const [error, setError] = useState<string | null>(null);

  function addColor(): void {
    const next = draft.trim().toLowerCase();
    if (!HEX_PATTERN.test(next)) {
      setError("Enter a 6-digit hex, e.g. #1a2b3c");
      return;
    }
    if (value.includes(next)) {
      setError("That color is already in the palette");
      return;
    }
    if (value.length >= MAX_COLORS) {
      setError(`Up to ${MAX_COLORS} colors`);
      return;
    }
    onChange([...value, next]);
    setDraft("#");
    setError(null);
  }

  function removeColor(color: string): void {
    onChange(value.filter((c) => c !== color));
  }

  function updateColor(index: number, next: string): void {
    const updated = [...value];
    updated[index] = next;
    onChange(updated);
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>Color palette</Label>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No colors yet. Add a few brand colors below.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {value.map((color, index) => (
            <div
              key={color}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-1.5"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(index, e.target.value)}
                aria-label={`Edit color ${color}`}
                className="h-7 w-7 cursor-pointer rounded-md border-0 bg-transparent p-0"
              />
              <span className="font-mono text-xs uppercase">{color}</span>
              <button
                type="button"
                onClick={() => removeColor(color)}
                aria-label={`Remove ${color}`}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addColor();
              }
            }}
            placeholder="#1a2b3c"
            className="font-mono"
            aria-invalid={Boolean(error)}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addColor}
          disabled={value.length >= MAX_COLORS}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  );
}
