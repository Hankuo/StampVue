---
name: sdd-workflow
description: >-
  Specification-Driven Development (SDD) guide and automation workflow.
  Use when defining PRDs, designing technical specifications, modeling architecture,
  defining API contracts, or creating atomic task checklists before code implementation.
---

# Specification-Driven Development (SDD) Skill

This skill guides the Agent and developer through structured, high-rigor **Specification-Driven Development (SDD)**, ensuring that architectural decisions, data models, APIs, and boundary conditions are rigorously specified before any production code is written.

---

## SDD Core Philosophy

1. **Specs as Executable Ground Truth**: Code is an implementation detail of the specification. Ambiguity in code stems from unaddressed ambiguity in specs.
2. **Strict Phase Gate**: No implementation starts before the PRD and Tech Spec pass mutual agreement and alignment.
3. **Traceability**: Every atomic task maps back to specific acceptance criteria (AC) in the PRD and contracts in the Tech Spec.

---

## Standard SDD Workflow

### Phase 1: Requirements Discovery & PRD Formulation
- **Output Artifact**: `docs/sdlc/PRD-<feature>.md` (Template: `docs/sdlc/01_PRD_TEMPLATE.md`)
- **Key Deliverables**:
  1. Target Users and Core Problem Statement.
  2. Concrete User Stories (`As a... I want to... So that...`).
  3. Strict **Out of Scope (Non-goals)** demarcation.
  4. Acceptance Criteria (AC) formulated in **Given-When-Then** or measurable rule lists.

### Phase 2: Technical Architecture & System Design (Tech Spec)
- **Output Artifact**: `docs/sdlc/SPEC-<feature>.md` (Template: `docs/sdlc/02_TECH_SPEC_TEMPLATE.md`)
- **Key Deliverables**:
  1. System Architecture & Component Interaction Flow (Mermaid diagrams).
  2. Data Models / Schemas / TypeScript Interfaces / Zod validators.
  3. API Endpoint Contracts (Path, Method, Headers, Payload, Responses, Error status codes).
  4. Non-Functional Requirements (NFRs: Latency, memory footprint, security boundaries, fault tolerance).
  5. Trade-offs and Alternative Evaluation.

### Phase 3: Atomic Task Breakdown
- **Output Artifact**: `docs/sdlc/TASKS-<feature>.md` (Template: `docs/sdlc/03_TASK_CHECKLIST_TEMPLATE.md`)
- **Key Deliverables**:
  1. Tasks grouped by Vertical Slice (e.g., Domain Model → Service/Logic → API Route → UI Component).
  2. Each task scoped to 15–30 minutes of focused coding.
  3. Explicit dependencies mapped between tasks.
  4. Associated test cases identified for each slice.

---

## Verification & Checkpoints
- Verify all template placeholders are replaced with domain specifics.
- Review error scenarios: network timeouts, invalid inputs, edge cases (empty states, oversized payloads, concurrent requests).
- Verify that every PRD requirement has an identified technical implementation in the Tech Spec.
