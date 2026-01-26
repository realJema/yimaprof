

## Payment Processing Page UX Refinement

This plan simplifies and improves the payment processing page experience by making each state clearer and more focused.

---

### Overview of Changes

| State | Current Behavior | New Behavior |
|-------|-----------------|--------------|
| **Initiating** | "Envoi en cours..." with phone display | Clear message: "Please confirm the payment on your phone for [amount] XAF" |
| **Processing** | Long list of instructions | Simple: "Checking payment..." with spinner |
| **Success** | Manual navigation buttons | Show success for 5 seconds, then auto-redirect to `/exams2` |
| **Failed** | Retry and back buttons | Clear failure message with "Try again" option |

---

### Implementation Steps

#### 1. Update Initiating State
- Display the subscription amount prominently
- Show message: "Please confirm the payment from MeSomb on your phone"
- Keep phone number and carrier badge for reference

#### 2. Simplify Processing State  
- Remove the detailed instruction list (check phone, enter PIN, etc.)
- Show only: "Checking payment..." with a loading spinner
- Keep the check counter as a subtle indicator

#### 3. Add Auto-Redirect on Success
- When `status === 'completed'`, start a 5-second countdown
- Display success message with countdown indicator
- Use `setTimeout` to navigate to `/exams2` after 5 seconds
- Still show manual navigation button as fallback

#### 4. Improve Failed State
- Clear failure message
- Prominent "Try again" button that navigates back to `/subscriptions`
- Optional: Show what went wrong if available

---

### Technical Details

**File to modify:** `src/pages/PaymentProcessing.tsx`

**Key changes:**

1. Add `useEffect` for auto-redirect on success:
```typescript
useEffect(() => {
  if (status === 'completed') {
    const timer = setTimeout(() => {
      navigate('/exams2');
    }, 5000);
    return () => clearTimeout(timer);
  }
}, [status, navigate]);
```

2. Update the initiating state JSX to show amount and clear instructions

3. Replace the processing state's detailed instructions with a simple "Checking payment..." message

4. Add countdown display in success state

---

### UI Preview

**Initiating State:**
- Icon: Spinning loader
- Title: "Confirm on your phone"
- Message: "Please confirm the payment of **[amount] XAF** from MeSomb on your phone"
- Phone number badge displayed

**Processing State:**
- Icon: Spinning loader  
- Title: "Checking payment..."
- Subtle: "Check #X of 30"

**Success State:**
- Icon: Green checkmark
- Title: "Payment successful!"
- Message: "Redirecting to exams in 5 seconds..."
- Fallback button: "Go to exams now"

**Failed State:**
- Icon: Red X
- Title: "Payment failed"
- Message: "The payment could not be completed"
- Button: "Try again"

