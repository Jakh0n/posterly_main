"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCampaign } from "@/app/(app)/campaigns/new/actions";

import { ProductPhotoUploader } from "./ProductPhotoUploader";

export interface NewCampaignFormProps {
  brandId: string | null;
}

interface FormValues {
  productName: string;
  price: string;
  promo: string;
  productImageUrl: string | null;
}

const INITIAL: FormValues = {
  productName: "",
  price: "",
  promo: "",
  productImageUrl: null,
};

export function NewCampaignForm({ brandId }: NewCampaignFormProps) {
  const [values, setValues] = useState<FormValues>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function patch(next: Partial<FormValues>): void {
    setValues((prev) => ({ ...prev, ...next }));
  }

  function handleSubmit(): void {
    setError(null);

    if (!values.productImageUrl) {
      setError("Upload a product photo before submitting");
      return;
    }

    startTransition(async () => {
      const result = await createCampaign({
        productName: values.productName,
        price: values.price,
        promo: values.promo,
        productImageUrl: values.productImageUrl as string,
        brandId,
      });

      // A successful action redirects; only failures return a value.
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      <ProductPhotoUploader
        value={values.productImageUrl}
        onChange={(url) => patch({ productImageUrl: url })}
        disabled={pending}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="product-name">Product name</Label>
        <Input
          id="product-name"
          value={values.productName}
          onChange={(e) => patch({ productName: e.target.value })}
          placeholder="Aurora Sneakers"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            value={values.price}
            onChange={(e) => patch({ price: e.target.value })}
            placeholder="$49"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="promo">Promo</Label>
          <Input
            id="promo"
            value={values.promo}
            onChange={(e) => patch({ promo: e.target.value })}
            placeholder="20% OFF"
            required
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Generate 3 variants (1 credit)
      </Button>
    </form>
  );
}
