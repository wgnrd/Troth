# iPhone App Plan

## Goal

Turn Troth into a shared web and iPhone app without implementing normal product
features twice.

The main rule is:

- task features live in shared Svelte components and stores
- native iPhone code is only for shell and device capabilities

That way, if a new button or task feature is added to the shared web UI, it
appears in the iPhone app automatically.

## Target Architecture

Use a hybrid setup:

- keep the existing SvelteKit app as the main product UI
- add a thin iPhone shell with Capacitor
- keep Troth as the backend boundary to Vikunja
- keep platform-specific logic small and isolated

This should stay true across all future work:

- shared Svelte UI owns screens, buttons, forms, and task interactions
- shared stores own task, list, filter, and connection behavior
- native code owns secure storage, app lifecycle, push, deep links, and other
  device-only features

## Phase 1

Ship an online-first iPhone app using the shared UI.

### App shell

- add Capacitor to the repo
- create an iOS app target
- configure the app to load Troth through the shared Svelte UI
- make safe-area, keyboard, and mobile viewport behavior work cleanly on iPhone

### Shared UI rule

- keep `src/lib/components/` and `src/lib/stores/` as the only place for normal
  feature work
- do not build a second SwiftUI task interface
- if a feature needs to show up on web and iPhone, implement it in shared
  Svelte code

### Backend and auth

The current app uses an encrypted HTTP-only browser session cookie. That works
well for the web app, but it is not enough as the only auth model for a native
shell.

Phase 1 should add a mobile-safe session approach:

- keep Troth talking to Vikunja
- add a native-friendly auth/session contract for the iPhone app
- store mobile session state in iOS secure storage
- keep existing typed app-facing task and project models
- do not move raw Vikunja calls into route components or UI components

### Delivery goal

Phase 1 targets personal use and TestFlight first, not public App Store
hardening.

## Phase 2

Add offline support without forking the UI.

### Offline strategy

- keep the same shared Svelte screens and stores
- add local persistence for last-known tasks, projects, and filters
- queue writes while offline
- sync queued writes when connectivity returns
- define conflict handling between local queued edits and server state

### Constraint

Offline is a data/sync problem, not a reason to split the UI by platform.

## Phase 3

Prepare for wider distribution if needed.

- harden the iPhone shell for App Store review requirements
- add platform polish where it improves mobile use without creating duplicate
  product features
- keep feature parity driven by the shared Svelte codebase

## Implementation Rules

- add new product features in shared Svelte code first
- treat iOS-specific code as an adapter layer, not a second frontend
- keep Vikunja access centralized in the Troth API layer
- preserve typed app-facing models in the UI
- avoid route-level duplication when a shared component can own the behavior

## Suggested Work Order

1. Add Capacitor and create the iOS shell.
2. Extract any browser-only assumptions that block the shared app from running
   cleanly inside the native shell.
3. Add a mobile-safe auth/session flow while preserving the existing web flow.
4. Verify all major views work on iPhone using the shared component tree.
5. Add offline cache and queued sync as a second phase.

## Acceptance Criteria

- Today, Inbox, Upcoming, All Active, Completed, Projects, Filters, and Settings
  work on iPhone
- a new shared UI button added to the web app also appears on iPhone without a
  second implementation
- task create, edit, complete, and refresh behavior still flows through the
  existing shared stores
- iPhone-specific code remains limited to shell and device integration concerns
