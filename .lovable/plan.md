

# Add Affiliate Dashboard Widget with Earnings Statistics & Recent Referrals

## Current State
The affiliate page (approved view) already has:
- 3 stats cards: Total Earned, Pending, Referrals count
- Affiliate link section
- Full earnings history table

## What to Add
Enhance the approved affiliate dashboard with richer statistics and a dedicated recent referrals widget:

### 1. Enhanced Stats Cards (replace existing 3-card grid)
Expand to a 4-card grid:
- **Total Earned** (existing) — keep as-is
- **Paid Out** — new card showing paid earnings with green styling
- **Pending Payout** — existing pending card
- **Total Referrals** — existing, add conversion context (e.g., "X this month")

### 2. New "Earnings Overview" Card (after stats, before affiliate link)
A summary card with:
- A simple bar/progress showing paid vs pending proportion
- Average commission per referral
- Most recent earning date
- Month-over-month earnings (current month total vs last month)

### 3. New "Recent Referrals" Card (after affiliate link, before full history table)
- Shows last 5 referrals in a compact list format (avatar placeholder, name, amount, date, status badge)
- "View all" link scrolls to the full earnings table below
- More visual than the table — uses a list with icons

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Affiliate.tsx` | Add paid stats card, earnings overview card, recent referrals widget |

No database changes needed — all data is already fetched from `affiliate_earnings`.

## Implementation Details

- Compute `paidEarnings` (already exists), `currentMonthEarnings`, `lastMonthEarnings`, `avgCommission` from the existing `earnings` array
- Progress bar showing paid/pending split uses the existing `Progress` component
- Recent referrals widget slices `earnings.slice(0, 5)` and renders a compact card list
- All text bilingual (fr/en) following existing patterns

