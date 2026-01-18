# Authentication & User Data Architecture

This document explains how authentication and user data flows through the TravelWise frontend application.

---

## Overview

The app uses a **hybrid approach** combining:
- **Zustand store** (`authStore`) for authentication state (tokens, isAuthenticated)
- **React Query** (`useUser` hook) for user data fetching and caching
- **SecureStore** for persistent token storage

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Startup                              │
├─────────────────────────────────────────────────────────────────┤
│  1. hydrate() loads tokens from SecureStore                    │
│  2. isAuthenticated = true if tokens exist                     │
│  3. useUser() fetches /api/auth/me and caches result           │
│  4. User data synced to authStore.user for fallback            │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

| File | Purpose |
|------|---------|
| `store/authStore.ts` | Zustand store for auth state (tokens, isAuthenticated, user) |
| `hooks/queries/useUser.ts` | React Query hook to fetch current user |
| `services/auth.ts` | API service for auth endpoints (login, register, getMe) |
| `app/_layout.tsx` | Root layout - calls `useUser()` to cache user early |

---

## Data Flow

### 1. App Startup (Hydration)

```
SecureStore
    │
    ▼
authStore.hydrate()
    │
    ├── accessToken: string
    ├── refreshToken: string
    └── isAuthenticated: true
```

**Key Point**: `user` is NOT stored in SecureStore. Only tokens are persisted.

### 2. User Data Fetching

```
useUser() hook (in _layout.tsx)
    │
    ▼
GET /api/auth/me
    │
    ▼
React Query Cache
    │
    ├── Returns cached data to ALL useUser() calls
    └── Syncs to authStore.user via updateUser()
```

**Key Point**: `useUser()` is called at the app root, so the user is fetched once and cached. All child components get instant access to cached data.

### 3. Accessing User Data in Components

**Preferred Method** - Use the hook:
```tsx
import { useUser } from '../hooks/queries/useUser';

function MyComponent() {
  const { data: user, isLoading } = useUser();
  // user.id, user.name, user.email, etc.
}
```

**Alternative** - Use the store (may be null initially):
```tsx
import { useAuth } from '../store/authStore';

function MyComponent() {
  const { user } = useAuth();
  // ⚠️ May be null if useUser() hasn't completed yet
}
```

---

## Token Refresh Flow

```
API Request with expired token
    │
    ▼
401 Unauthorized
    │
    ▼
Axios interceptor catches error
    │
    ▼
POST /api/auth/refresh (with refreshToken)
    │
    ├── Success: Update tokens, retry original request
    └── Failure: Logout user, redirect to login
```

See `services/api.ts` for the interceptor implementation.

---

## Login Flow

```
User submits credentials
    │
    ▼
POST /api/auth/login
    │
    ▼
Response: { accessToken, refreshToken }
    │
    ▼
authStore.setTokens() 
    │
    ├── Saves to SecureStore
    └── Sets isAuthenticated = true
    │
    ▼
_layout.tsx navigation effect triggers
    │
    ▼
Redirects to /(tabs)
    │
    ▼
useUser() fetches and caches user data
```

---

## Logout Flow

```
User clicks logout
    │
    ▼
authStore.logout()
    │
    ├── Clears SecureStore tokens
    ├── Clears React Query cache
    ├── Sets isAuthenticated = false
    └── Sets user = null
    │
    ▼
_layout.tsx navigation effect triggers
    │
    ▼
Redirects to /auth/login
```

---

## Key Design Decisions

### Why not store user in SecureStore?

1. **Staleness**: User data can change (name, avatar) and we'd have stale data
2. **Size**: SecureStore is for small secure data, not full objects
3. **React Query**: Already provides excellent caching with stale-while-revalidate

### Why call useUser() at root level?

1. **Prefetching**: User is fetched as soon as app loads
2. **Caching**: All child components get cached data instantly
3. **No prop drilling**: Any component can call `useUser()` independently

### Why keep user in authStore at all?

1. **Fallback**: Some rare cases may need user before Query resolves
2. **Non-React code**: If any utility needs user outside components
3. **Future**: Could persist user to SecureStore for offline support

---

## Common Patterns

### Check if user is authenticated
```tsx
const { isAuthenticated, isRestoring } = useAuth();

if (isRestoring) return <LoadingScreen />;
if (!isAuthenticated) return <LoginScreen />;
```

### Get current user ID
```tsx
const { data: user } = useUser();
const userId = user?.id;
```

### Check if message is from current user
```tsx
const { data: user } = useUser();
const isOwnMessage = message.senderId === user?.id;
```

---

## Troubleshooting

### User is undefined in component
- Ensure `useUser()` is called in `_layout.tsx`
- The component may render before query completes - use `isLoading` state

### User data is stale
- React Query refetches on window focus and mount
- Set shorter `staleTime` in useUser hook if needed

### Tokens not persisting
- Check SecureStore permissions on device
- Clear app data and try again
