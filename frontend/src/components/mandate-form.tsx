'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Plus, ShieldCheck, X } from 'lucide-react';
import type { Mandate } from '@/contracts';
import { DEFAULT_MANDATE, fetchActiveMandate, saveMandateRequest } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface MandateFormProps {
  initialMandate?: Mandate;
  onSaved?: (mandate: Mandate) => void;
}

const PRESETS: { label: string; apply: (base: Mandate) => Mandate }[] = [
  {
    label: 'Hackathon Demo ($250 Cap)',
    apply: (base) => ({
      ...base,
      maxPerPurchase: 250,
      maxSessionTotal: 500,
      autoApproveBelow: 75,
      allowedCategories: ['electronics', 'audio', 'accessories'],
      blockedMerchants: ['ShadyGadgets', 'UnverifiedOutlet'],
      currency: 'USD',
    }),
  },
  {
    label: 'Strict Autonomous ($60 Cap)',
    apply: (base) => ({
      ...base,
      maxPerPurchase: 60,
      maxSessionTotal: 150,
      autoApproveBelow: 60,
      allowedCategories: ['accessories', 'electronics'],
      blockedMerchants: ['ShadyGadgets'],
      currency: 'USD',
    }),
  },
  {
    label: 'Zero-Click High Trust ($300 Auto)',
    apply: (base) => ({
      ...base,
      maxPerPurchase: 300,
      maxSessionTotal: 600,
      autoApproveBelow: 300,
      allowedCategories: ['electronics', 'audio', 'accessories'],
      blockedMerchants: ['ShadyGadgets'],
      currency: 'USD',
    }),
  },
];

export function MandateForm({ initialMandate, onSaved }: MandateFormProps) {
  const [baseMandate, setBaseMandate] = useState<Mandate>(initialMandate ?? DEFAULT_MANDATE);
  const [maxPerPurchase, setMaxPerPurchase] = useState(String(baseMandate.maxPerPurchase));
  const [maxSessionTotal, setMaxSessionTotal] = useState(String(baseMandate.maxSessionTotal));
  const [autoApproveBelow, setAutoApproveBelow] = useState(String(baseMandate.autoApproveBelow));
  const [deliverBy, setDeliverBy] = useState(baseMandate.deliverBy ?? '');
  const [expiresAt, setExpiresAt] = useState(baseMandate.expiresAt.slice(0, 10));
  const [allowedCategories, setAllowedCategories] = useState<string[]>(baseMandate.allowedCategories);
  const [blockedMerchants, setBlockedMerchants] = useState<string[]>(baseMandate.blockedMerchants);
  const [newCategory, setNewCategory] = useState('');
  const [newMerchant, setNewMerchant] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (initialMandate) return;
    fetchActiveMandate().then((loaded) => {
      setBaseMandate(loaded);
      setMaxPerPurchase(String(loaded.maxPerPurchase));
      setMaxSessionTotal(String(loaded.maxSessionTotal));
      setAutoApproveBelow(String(loaded.autoApproveBelow));
      setDeliverBy(loaded.deliverBy ?? '');
      setExpiresAt(loaded.expiresAt.slice(0, 10));
      setAllowedCategories(loaded.allowedCategories);
      setBlockedMerchants(loaded.blockedMerchants);
    });
  }, [initialMandate]);

  const syncAriaInvalid = (el: EventTarget & HTMLInputElement) => {
    el.setAttribute('aria-invalid', el.matches(':user-invalid') ? 'true' : 'false');
  };

  const applyPreset = (presetFn: (base: Mandate) => Mandate) => {
    const next = presetFn(baseMandate);
    setMaxPerPurchase(String(next.maxPerPurchase));
    setMaxSessionTotal(String(next.maxSessionTotal));
    setAutoApproveBelow(String(next.autoApproveBelow));
    setAllowedCategories(next.allowedCategories);
    setBlockedMerchants(next.blockedMerchants);
    setSavedBanner(null);
    setErrorBanner(null);
  };

  const addCategory = () => {
    const val = newCategory.trim().toLowerCase();
    if (!val || allowedCategories.includes(val)) return;
    setAllowedCategories([...allowedCategories, val]);
    setNewCategory('');
  };

  const addMerchant = () => {
    const val = newMerchant.trim();
    if (!val || blockedMerchants.includes(val)) return;
    setBlockedMerchants([...blockedMerchants, val]);
    setNewMerchant('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(null);
    setErrorBanner(null);

    try {
      const saved = await saveMandateRequest({
        id: baseMandate.id,
        maxPerPurchase: Number(maxPerPurchase),
        maxSessionTotal: Number(maxSessionTotal),
        autoApproveBelow: Number(autoApproveBelow),
        allowedCategories,
        blockedMerchants,
        deliverBy: deliverBy || undefined,
        currency: 'USD',
        expiresAt: new Date(`${expiresAt}T23:59:59.000Z`).toISOString(),
      });

      setBaseMandate(saved);
      setSavedBanner(`Mandate ${saved.id} saved and active across your shopping session.`);
      onSaved?.(saved);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to save Mandate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-white/15 bg-[#121214]/92">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <CardTitle className="text-xl">Spending Mandate Configuration</CardTitle>
          </div>
          <Badge variant="default">
            ID: <code>{baseMandate.id}</code> &bull; USD Locked
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#8e8e8e]">Quick presets:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.apply)}
              className="cursor-pointer rounded-full border border-white/15 bg-[#28282a] px-3 py-1 text-xs text-[#d0d0d0] transition-colors hover:border-white/35 hover:text-white"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="max-per-purchase" className="block text-sm font-medium text-white">
                Max Per Purchase (USD)
              </label>
              <span id="max-per-purchase-hint" className="mt-0.5 mb-2 block text-xs text-[#8e8e8e]">
                Hard code cap per single order (&ge; $1)
              </span>
              <Input
                id="max-per-purchase"
                type="number"
                min={1}
                step="0.01"
                required
                value={maxPerPurchase}
                aria-describedby="max-per-purchase-hint"
                onBlur={(e) => syncAriaInvalid(e.currentTarget)}
                onChange={(e) => {
                  setMaxPerPurchase(e.target.value);
                  if (e.currentTarget.hasAttribute('aria-invalid')) {
                    syncAriaInvalid(e.currentTarget);
                  }
                }}
              />
              <p className="gp-error-msg mt-1 text-xs text-red-400">
                Enter a valid USD amount of at least $1.00.
              </p>
            </div>

            <div>
              <label htmlFor="max-session-total" className="block text-sm font-medium text-white">
                Max Session Total (USD)
              </label>
              <span id="max-session-hint" className="mt-0.5 mb-2 block text-xs text-[#8e8e8e]">
                Cumulative spend limit per session
              </span>
              <Input
                id="max-session-total"
                type="number"
                min={1}
                step="0.01"
                required
                value={maxSessionTotal}
                aria-describedby="max-session-hint"
                onBlur={(e) => syncAriaInvalid(e.currentTarget)}
                onChange={(e) => {
                  setMaxSessionTotal(e.target.value);
                  if (e.currentTarget.hasAttribute('aria-invalid')) {
                    syncAriaInvalid(e.currentTarget);
                  }
                }}
              />
              <p className="gp-error-msg mt-1 text-xs text-red-400">
                Enter a valid session cap of at least $1.00.
              </p>
            </div>

            <div>
              <label htmlFor="auto-approve-below" className="block text-sm font-medium text-white">
                Auto-Approve Below (USD)
              </label>
              <span id="auto-approve-hint" className="mt-0.5 mb-2 block text-xs text-[#8e8e8e]">
                0 = always require human click
              </span>
              <Input
                id="auto-approve-below"
                type="number"
                min={0}
                step="0.01"
                required
                value={autoApproveBelow}
                aria-describedby="auto-approve-hint"
                onBlur={(e) => syncAriaInvalid(e.currentTarget)}
                onChange={(e) => {
                  setAutoApproveBelow(e.target.value);
                  if (e.currentTarget.hasAttribute('aria-invalid')) {
                    syncAriaInvalid(e.currentTarget);
                  }
                }}
              />
              <p className="gp-error-msg mt-1 text-xs text-red-400">
                Must be $0.00 or higher.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="deliver-by" className="block text-sm font-medium text-white">
                Deliver By (Optional)
              </label>
              <span id="deliver-by-hint" className="mt-0.5 mb-2 block text-xs text-[#8e8e8e]">
                Format: YYYY-MM-DD (firm shipping check)
              </span>
              <Input
                id="deliver-by"
                type="date"
                value={deliverBy}
                aria-describedby="deliver-by-hint"
                onChange={(e) => setDeliverBy(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="expires-at" className="block text-sm font-medium text-white">
                Mandate Expires On
              </label>
              <span id="expires-at-hint" className="mt-0.5 mb-2 block text-xs text-[#8e8e8e]">
                Expired Mandates fail closed automatically
              </span>
              <Input
                id="expires-at"
                type="date"
                required
                value={expiresAt}
                aria-describedby="expires-at-hint"
                onBlur={(e) => syncAriaInvalid(e.currentTarget)}
                onChange={(e) => {
                  setExpiresAt(e.target.value);
                  if (e.currentTarget.hasAttribute('aria-invalid')) {
                    syncAriaInvalid(e.currentTarget);
                  }
                }}
              />
              <p className="gp-error-msg mt-1 text-xs text-red-400">
                Expiration date is required.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2.5 rounded-2xl border border-white/10 bg-black/40 p-4">
              <label htmlFor="new-category" className="block text-sm font-medium text-white">
                Allowed Categories
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allowedCategories.map((cat) => (
                  <Badge key={cat} variant="default" className="gap-1">
                    {cat}
                    <button
                      type="button"
                      aria-label={`Remove category ${cat}`}
                      onClick={() =>
                        setAllowedCategories(allowedCategories.filter((c) => c !== cat))
                      }
                      className="cursor-pointer hover:text-red-300"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="new-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                  placeholder="Add category (e.g. office)"
                  className="h-9 text-xs"
                />
                <Button type="button" size="sm" variant="darkPill" onClick={addCategory}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-white/10 bg-black/40 p-4">
              <label htmlFor="new-merchant" className="block text-sm font-medium text-white">
                Blocked Merchants
              </label>
              <div className="flex flex-wrap gap-1.5">
                {blockedMerchants.map((merchant) => (
                  <Badge key={merchant} variant="deny" className="gap-1">
                    {merchant}
                    <button
                      type="button"
                      aria-label={`Unblock merchant ${merchant}`}
                      onClick={() =>
                        setBlockedMerchants(blockedMerchants.filter((m) => m !== merchant))
                      }
                      className="cursor-pointer hover:text-white"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="new-merchant"
                  value={newMerchant}
                  onChange={(e) => setNewMerchant(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMerchant();
                    }
                  }}
                  placeholder="Block merchant name"
                  className="h-9 text-xs"
                />
                <Button type="button" size="sm" variant="darkPill" onClick={addMerchant}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Block
                </Button>
              </div>
            </div>
          </div>

          {savedBanner && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-2xl border border-emerald-400/35 bg-emerald-500/12 px-4 py-3 text-xs text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              {savedBanner}
            </div>
          )}

          {errorBanner && (
            <div
              role="alert"
              className="rounded-2xl border border-red-400/35 bg-red-500/12 px-4 py-3 text-xs text-red-200"
            >
              {errorBanner}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="lg" disabled={saving}>
              {saving ? 'Saving Mandate...' : 'Save Active Mandate'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
