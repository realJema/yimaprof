
# Fix Edge Function 401 Error - Auth Token Refresh Issue

## Problem Diagnosis

The edge function is returning **401 Unauthorized** because of an authentication token issue. Investigation revealed:

1. **Auth logs show**: `Invalid Refresh Token: Refresh Token Not Found` at `10:01:38Z`
2. **Edge function logs show**: Requests reaching the function but failing at JWT validation (401 status)
3. **Root cause**: The user's refresh token was revoked/invalidated (possibly from logging in on another device), and when the app tried to use the expired access token, the refresh failed silently

The Supabase JS client stores the session in localStorage. When the access token expires (~1 hour by default), it automatically tries to refresh using the refresh token. If that fails, the user object from `useAuth` may still show a stale user (from the initial `getSession()` call), but actual API calls fail because no valid token can be obtained.

## Solution Overview

Add proper handling for session refresh failures so that:
1. The app detects when authentication is truly broken
2. Users are logged out and redirected when tokens are invalid
3. Edge function calls properly await session validation before proceeding

---

## Technical Implementation

### Step 1: Enhance Auth Hook with Session Validation

Update the `useAuth` hook to:
- Add a `refreshSession` function to explicitly refresh/validate the session before critical operations
- Handle `SIGNED_OUT` events properly when token refresh fails
- Detect and handle the case where user object exists but session is invalid

### Step 2: Update PaymentProcessing Component

Before initiating payment:
- Explicitly check/refresh the session
- If session is invalid, redirect to login with a return URL
- Add better error handling for auth-related failures

### Step 3: Add Session Refresh to Payment Flow

Wrap the edge function call with session validation:
```typescript
// Before calling the edge function
const { data: { session }, error } = await supabase.auth.getSession();
if (!session) {
  // Token refresh failed, redirect to login
  navigate('/auth?returnTo=/subscriptions');
  return;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAuth.tsx` | Add `refreshSession()` method, improve auth event handling |
| `src/pages/PaymentProcessing.tsx` | Validate session before initiating payment |
| `src/pages/Payment.tsx` | Validate session before test payment |

---

## Code Changes

### useAuth.tsx Enhancements

Add to the context:
- `refreshSession: () => Promise<boolean>` - Returns true if session is valid
- Better handling of `TOKEN_REFRESHED` and `SIGNED_OUT` events

### PaymentProcessing.tsx Changes

```typescript
const initiatePayment = useCallback(async () => {
  if (!planId || !phoneNumber || !amount || !user) {
    navigate('/subscriptions');
    return;
  }

  // Validate session before proceeding
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    toast({
      title: 'Session Expired',
      description: 'Please log in again to complete your payment.',
      variant: 'destructive',
    });
    navigate('/auth?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search));
    return;
  }

  // Proceed with payment...
}, [...]);
```

---

## Why This Happens

The Supabase client stores sessions in localStorage. When:
1. User logs in → access token (valid ~1 hour) + refresh token stored
2. User stays on page → access token expires
3. User triggers API call → client tries to refresh token
4. If refresh token was revoked (login elsewhere, logout on another device), refresh fails
5. The `user` object in React state is stale, but no valid session exists
6. Edge function call includes no/invalid token → 401

## Testing

1. Log in as a user
2. Open DevTools → Application → Local Storage
3. Delete `sb-nrcdtxgmlhxbtfppxqop-auth-token` key
4. Try to initiate payment
5. Should redirect to login with appropriate message (after fix)
