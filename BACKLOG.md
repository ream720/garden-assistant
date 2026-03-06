# Grospace Project Backlog

## MVP Launch Priority Backlog (Added March 3, 2026)

- [x] **Friendly Firebase Auth Errors (Login Flows)**: Replaced raw Firebase auth errors with user-friendly messaging for login failures (invalid credentials, quota, network, etc.).
- [x] **Add Plant Icon Update**: Replaced generic plus icons on "Add Plant" actions with a plant-specific icon for clearer affordance.
- [x] **Intro Modal / Onboarding**: Added a first-run onboarding modal with basic usage guidance for new users.
- [x] **Spaces: Consolidated Add Action**: Implemented a single "Add" button in Space detail that supports creating both Plants and Notes.
- [x] **Task Attachment UX Research/Design**: Implemented contextual task flows in Plant and Space detail pages (in-context add/edit/complete/delete with prefilled associations).
- [x] **Dashboard Tile Click Behavior**: Made Dashboard stat tiles clickable with explicit routes (Active Plants -> `/plants?status=active`, Open Issues -> `/tasks?tab=issues`, Tasks Due -> `/tasks?tab=dueSoon`, Total Harvests -> `/plants?status=harvested`).
- [x] **Upcoming Tasks on Dashboard**: Added plant/space context labels to upcoming task rows so each task shows what it is attached to.
- [x] **Notes/Tasks Relationship (MVP Flow)**: Kept Tasks as schedulable entities (due date, priority, recurrence) and added linked completion-note capture as a default flow so plant/space history stays consolidated in Notes.
- [x] **Notes vs Tasks UX Clarity Pass (March 6, 2026)**: Added page-level guidance, decision support copy, and contextual help popovers to reduce ambiguity about when to use Notes vs Tasks.
- [x] **Dashboard Quick Actions Clarity (March 6, 2026)**: Added intent labels and Notes/Tasks helper content so users can distinguish "log context" vs "schedule work" before opening forms.
- [x] **Task Completion Note Guidance (March 6, 2026)**: Clarified that linked completion notes create Notes-history entries tied to the same plant/space.
- [ ] **Notes + Tasks IA Review**: Decide whether to keep separate Notes/Tasks routes long-term or introduce a unified Events timeline with type filters.
- [ ] Record Harvest feature should allow a harvest note (to record success/failure/learnings/lessons etc.)
- [ ] Consider which 4 features are the most useful to show at the top of the Dashboard (currently Acitve Plants, Open Issues, Tasks Due, and Harvests)

## MVP Launch Checklist (Consolidated March 4, 2026)

Source docs: `MVP_TEST_GATE.md`, `E2E_TESTING.md`, `TEST_SUMMARY.md`

### Release Gates (Pre-Invite / Pre-Launch)

- [ ] **Lint Gate Readiness**: Add ESLint v9 flat config (`eslint.config.*`) or pin ESLint v8 so lint can become a required deploy gate.
- [ ] **E2E Auth Stability**: Move login-heavy Playwright runs to Firebase Emulator or staging credentials to avoid `auth/quota-exceeded`.
- [ ] **Flaky Test Fix**: Stabilize the intermittent plant-edit assertion in `e2e/plants.spec.ts`.
- [ ] **Shakedown Runbook**: Before each invite wave, run and log results for `npm run typecheck`, `npm run build`, `npm run test`, and targeted `npm run test:e2e`.

### High-Priority MVP Test Coverage Gaps

- [ ] **Overdue Tasks UI Validation**: Verify overdue task behavior (manual path currently skipped because of date-picker flakiness).
- [ ] **Note Photo Upload E2E**: Add/validate end-to-end coverage for note photo upload flow.
- [ ] **Profile + Settings E2E**: Cover profile rendering, settings load, display-name update, theme toggle, and settings logout.
- [ ] **Dashboard Quick Actions E2E**: Validate Add Plant/Space/Note/Task quick actions plus dashboard task completion.
- [ ] **Auth Edge Cases E2E**: Cover duplicate email, mismatched passwords, short passwords, reset password, session persistence, and remember-me behavior.
- [ ] **Error/Resilience Checks**: Validate offline behavior, friendly Firebase errors, and empty states for no spaces/plants/tasks/notes.
- [ ] **Responsive Smoke Coverage**: Validate mobile nav, dashboard card stacking, and form usability on small viewports.

## Monetization Backlog (Consolidated March 4, 2026)

Source docs: `MONETIZATION_STRATEGY_AUDIT.md`, `MONETIZATION_IMPLEMENTATION_PLAN.md`

### P0 Monetization Foundation (Stripe Test Mode First)

- [ ] **Finalize Free/Pro Packaging**: Confirm limits, pricing (`$9/mo`, `$79/yr`), and trial/intro offer decision.
- [ ] **Stripe Product Setup (Test)**: Create Pro monthly/yearly products/prices and store price IDs in environment config.
- [ ] **Checkout Session Endpoint**: Implement secure `createCheckoutSession`.
- [ ] **Billing Portal Endpoint**: Implement secure `createBillingPortalSession`.
- [ ] **Webhook Processing**: Implement `stripeWebhook` with signature verification and idempotent processing.
- [ ] **Subscription Sync**: Sync Stripe state to `users/{uid}` fields (`plan`, `planStatus`, `billingCycle`, `currentPeriodEnd`, `trialEndsAt`).
- [ ] **Entitlements Schema**: Add `entitlements/{uid}` for resource caps and paid feature flags.
- [ ] **Usage Schema + Reset Logic**: Add `usage/{uid}` counters with monthly reset (`lastResetMonth`).
- [ ] **Limit Guards in Create Flows**: Enforce quota checks in spaces/plants/notes/photo upload flows with clear upgrade prompts.
- [ ] **Settings Plan Card + Usage Meter**: Replace beta-only account status with plan details and an upgrade CTA.
- [ ] **Billing Route + Navigation**: Add `/billing` and wire upgrade/manage billing flows.
- [ ] **Required Policy Pages**: Publish `/terms`, `/privacy`, `/subscription-terms`, `/refund-policy`, and link them site-wide.

### P1 Monetization Hardening

- [ ] **Hard Enforcement in Rules**: Add Firestore/Storage and backend checks to block over-limit writes.
- [ ] **Near-Limit UX**: Add 80/90/100% usage warning states and polished paywall messaging.
- [ ] **Billing Lifecycle UX**: Surface `trialing`, `past_due`, `canceled`, and `incomplete` account states.

### P2 Monetization Optimization

- [ ] **Billing Funnel Analytics**: Track upgrade/paywall/checkout/portal/cancel/payment-failed events.
- [ ] **Controlled Rollout Plan**: Enable billing for a subset of users first and monitor conversion/churn.
- [ ] **Stripe Live Readiness**: Complete live-mode checklist after EIN/business verification is finished.
- [ ] **Secondary Revenue Layer (Later)**: Evaluate contextual affiliate recommendations after subscription conversion stabilizes.

## 🐞 Potential Bugs

- [x] **Missing Firestore Indexes**: Updated `firestore.indexes.json` with all necessary composite indexes for tasks, notes, plants, and spaces. (Pending User Deployment)
- [x] **Toast Implementation**: `TasksPage.tsx` uses a simple `console.log` for toasts instead of a real toast library.
- [x] **Tabs Implementation**: `TaskList.tsx` uses standard Radix UI Tabs for consistency.
- [x] **Login Timeout**: Implemented session-based auth persistence. Users are now logged out when browser closes (unless "Remember Me" is checked).
- [x] **Navigation/Auth State**: Verified that auth redirects work correctly across all routes. All 7 protected routes load properly when authenticated.
- [x] **Date Handling**: Comprehensive audit completed. Date handling is robust across the app - uses `date-fns` library for all date operations with custom `dateUtils.ts` for edge cases. No issues found.

## 🛠️ Major TODOs

- [x] **Profile Updates**: `authStore.ts` profile update logic implemented.
- [x] **Dashboard Refactoring**: `dashboard.tsx` modularized.
- [x] **Note Categories**: All 6 note categories (observation, feeding, pruning, issue, milestone, general) fully implemented and integrated.
- [x] **Task Categories/Priority**: All task filters and grouping logic verified in `TaskList.tsx`.
- [x] **Image Uploads**: `PhotoUpload.tsx` is fully integrated! uploads to Firebase Storage, generates download URLs, saves to Firestore, and handles cleanup on deletion.
- [x] **Search Functionality**: `NoteList` and `TaskList` both have working search - filters local state client-side after data loads from backend. This is appropriate for beta launch. Can be enhanced with backend filtering in future if needed for performance.

## 🚀 Features to Finish

- [x] **Settings Page**: Implemented at `/settings`.
- [x] **Create New Space from Plant Form**: Implemented with unique timestamp-based naming.
- [x] **User Profile Page**: Implemented at `/profile` with user info, garden statistics, and activity feed.
- [x] **Activity Feed**: Unified activity feed on Dashboard and Profile, showing notes, tasks, plants, and spaces chronologically.
- [x] **Garden Statistics**: Expanded dashboard stats with success rate, avg harvest time, 6 total stat cards. Includes dev-only mock data toggle for testing.
- [x] **Activity Feed Enhancement**: Added filter tabs (All, Notes, Tasks, Plants, Spaces) on Dashboard Activity Feed.

## 🌐 Future Social Features (Post-Beta)

Following the successful beta launch, these features will build upon the Activity Feed foundation:

### Phase 2: Public Profiles

- [ ] **Profile URL**: `/profile/[userId]` - View other users' profiles
- [ ] **Privacy Controls**: Public/private/followers-only settings
- [ ] **Profile Customization**: Bio, profile picture, featured plants

### Phase 3: Follow System

- [ ] **Follow/Unfollow**: Users can follow other gardeners
- [ ] **Followers/Following Counts**: Display social connections
- [ ] **Activity Feed**: See activities from followed users
- [ ] **Notifications**: New follower alerts

### Phase 4: Social Interactions

- [ ] **Like/Comment**: Engage with activities
- [ ] **Share Achievements**: Share harvests, milestones
- [ ] **Leaderboards**: Most active gardeners, best success rates
- [ ] **Community**: Garden tips, Q&A section

## 🧪 Testing

- [ ] **Integration Tests**: Audit the app for features that need Integration Testing.
- [ ] **Integration Tests**: Add Playwright tests for "Create New Space" functionality in PlantForm (Radix UI Select component testing is challenging in unit tests).
- [ ] **Integration Tests**: Add Playwright tests for all appropriate features.

### Edge Case Testing

- [ ] **Activity Feed Truncation**: Test with very long note content (should truncate or wrap properly)
- [ ] **Activity Feed Scroll**: Test with 100+ activities (performance and scroll behavior)
- [ ] **Deleted References**: Test activity items referencing deleted plants/spaces (should handle gracefully)
- [ ] **Empty States**: Verify all empty states display correctly (new user, no data scenarios)
- [ ] **Garden Stats Edge Cases**: Test with no harvests, no plants, plants without harvest dates
- [ ] **Responsive Design**: Test profile page and activity feed on mobile/tablet viewports
- [ ] **Date Display**: Test with activities from various time ranges (minutes ago, days ago, months ago)

