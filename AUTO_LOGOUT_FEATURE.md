# Auto-Logout Feature - Inactivity Timer

## ✅ Feature Overview

Automatically logs out users after **2 minutes of inactivity** with a **10-second warning popup**.

---

## 🎯 How It Works

### Inactivity Detection
- Tracks user activity: mouse movements, clicks, keyboard input, scrolls, touches
- Resets timer on any activity
- Total inactivity timeout: **2 minutes (120 seconds)**

### Warning System
- Warning appears at: **1 minute 50 seconds** (10 seconds before logout)
- Shows countdown timer: **10... 9... 8...**
- Visual progress bar decreases from 100% to 0%

### Auto-Logout
- If no action taken: Automatic logout at 2:00
- Redirects to login page
- Clears authentication tokens

---

## 🎨 Warning Popup Features

**Visual Elements:**
- ⚠️ Yellow warning icon
- Large countdown display (10-9-8...)
- Animated progress bar (yellow to orange gradient)
- Two action buttons

**User Actions:**
1. **Stay Logged In** (Continue button)
   - Resets the entire timer
   - Closes popup
   - User stays authenticated

2. **Logout Now** button
   - Immediate logout
   - Redirects to login

---

## ⏱️ Timeline

```
Time      | Event
----------|--------------------------------------------------
0:00      | User activity (timer starts/resets)
...       | User is active or inactive
1:50      | ⚠️ WARNING POPUP appears (10 seconds left)
1:51-2:00 | Countdown: 9, 8, 7, 6, 5, 4, 3, 2, 1, 0
2:00      | 🚪 AUTO-LOGOUT (if no action taken)
```

---

## 🔧 Technical Implementation

### Component Location
`frontend/src/components/InactivityTimer.tsx`

### Configuration
```typescript
const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const WARNING_TIME = 10 * 1000;          // 10 seconds
```

### Activity Events Tracked
- `mousedown`
- `mousemove`
- `keypress`
- `scroll`
- `touchstart`
- `click`

### Integration
Wrapped in `app/layout.tsx` inside `AuthProvider`:
```tsx
<AuthProvider>
  <InactivityTimer>
    {children}
  </InactivityTimer>
</AuthProvider>
```

---

## 🧪 Testing

### Test 1: Normal Activity
1. Login to application
2. Use the app normally (move mouse, click, type)
3. **Expected:** No warning, stays logged in

### Test 2: Warning Popup
1. Login to application
2. Don't touch mouse/keyboard for 1 minute 50 seconds
3. **Expected:** Warning popup appears with 10-second countdown

### Test 3: Continue Session
1. Trigger warning popup (wait 1:50)
2. Click "Stay Logged In" button
3. **Expected:** Timer resets, popup closes, stays logged in

### Test 4: Auto-Logout
1. Login to application
2. Don't touch anything for full 2 minutes
3. **Expected:** Automatic logout, redirect to login page

### Test 5: Manual Logout
1. Trigger warning popup
2. Click "Logout Now" button
3. **Expected:** Immediate logout, redirect to login

---

## 🎨 UI Components

**Popup Design:**
- Centered modal with backdrop blur
- Smooth fade-in animation
- Slide-up effect
- Responsive design
- Dark mode support

**Progress Bar:**
- Gradient: Yellow → Orange
- Smooth 1-second transitions
- Decreases from 100% to 0%

**Countdown Display:**
- Large 5xl font size
- Tabular numbers (monospace digits)
- Yellow color matching theme

---

##  Customization

**To change timeout duration:**
```typescript
// In InactivityTimer.tsx
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const WARNING_TIME = 30 * 1000;           // 30 seconds warning
```

**To disable on specific pages:**
```tsx
// In page component
<InactivityTimer disabled={true}>
  {children}
</InactivityTimer>
```

---

## ✅ Security Benefits

- Prevents unauthorized access to unattended sessions
- Automatic session cleanup
- Configurable timeout based on security requirements
- User-friendly warning system
- Prevents session hijacking from unattended devices

---

**Feature Complete!** Users are now automatically protected from idle sessions. 🔒
