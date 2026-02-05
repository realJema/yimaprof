
## Add Manual "I've Confirmed" Button to Payment Processing

This enhancement adds a button during the `processing` state that allows users to manually trigger an immediate payment status check, without removing the existing automatic polling.

---

### What Changes

**File: `src/pages/PaymentProcessing.tsx`**

1. **Add a loading state for manual check**
   - New state: `isManualChecking` to show loading on the button while checking

2. **Add manual check handler**
   ```typescript
   const [isManualChecking, setIsManualChecking] = useState(false);
   
   const handleManualCheck = async () => {
     if (!transactionId || isManualChecking) return;
     setIsManualChecking(true);
     await checkPaymentStatus(transactionId);
     setIsManualChecking(false);
   };
   ```

3. **Add button in the `processing` state UI**
   - Below the phone number display, add a confirmation button
   - Button text: "J'ai confirmé le paiement" (I've confirmed the payment)
   - Shows a loading spinner when checking
   - Disabled while checking to prevent spam

---

### Updated UI for Processing State

```text
┌─────────────────────────────────────────┐
│      (Loader spinning)                   │
│                                          │
│   Vérification du paiement...           │
│   Vérification #3 sur 30                │
│                                          │
│   ┌─────────────────────────────────┐   │
│   │  📱  692 482 337    [ORANGE]    │   │
│   └─────────────────────────────────┘   │
│                                          │
│   ┌─────────────────────────────────┐   │
│   │  ✓ J'ai confirmé le paiement    │   │  ← NEW BUTTON
│   └─────────────────────────────────┘   │
│                                          │
│   (small text: auto-check continues)     │
└─────────────────────────────────────────┘
```

---

### Technical Details

| Aspect | Implementation |
|--------|----------------|
| New state | `isManualChecking: boolean` |
| New handler | `handleManualCheck()` - calls existing `checkPaymentStatus()` |
| Button placement | Inside `CardContent` when `status === 'processing'` |
| Button disabled | When `isManualChecking` is true |
| Auto-polling | Unchanged - continues running every 10 seconds |

---

### Code to Add

**New state:**
```typescript
const [isManualChecking, setIsManualChecking] = useState(false);
```

**New handler:**
```typescript
const handleManualCheck = async () => {
  if (!transactionId || isManualChecking) return;
  setIsManualChecking(true);
  await checkPaymentStatus(transactionId);
  setIsManualChecking(false);
};
```

**New button in processing state (after phone display):**
```tsx
{status === 'processing' && (
  <Button 
    onClick={handleManualCheck} 
    disabled={isManualChecking}
    variant="outline"
    className="w-full"
    size="lg"
  >
    {isManualChecking ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Vérification en cours...
      </>
    ) : (
      <>
        <CheckCircle className="mr-2 h-4 w-4" />
        J'ai confirmé le paiement
      </>
    )}
  </Button>
)}
```

---

### Benefits

- Users don't have to wait up to 10 seconds for the next automatic check
- Especially helpful for Orange Money where USSD confirmation takes longer
- Non-disruptive - automatic polling continues as backup
- Simple addition with minimal code changes
