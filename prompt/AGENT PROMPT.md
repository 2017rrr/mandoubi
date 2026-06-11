# Mandoubi — Project Contract (every agent reads this first)

## What Mandoubi is
A Bahrain delivery platform connecting store owners with delivery
drivers (مندوب). Independent project — own repo, own database, own domain.
Built on the same structure as Mishwar but COMPLETELY separate.

## Tech stack (do not change without explicit approval)
- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- Bot: Telegram (@Mandoubi_bot — in setup)
- Container: mobile-first, 430px max width (.app-container)
- Direction: Arabic RTL primary, English secondary

## Identity (preserve — never replace)
- Primary color: orange — hsl(22, 100%, 55%) / #f97316
- Background: warm black — hsl(18, 20%, 4%)
- Card: dark — hsl(20, 22%, 9%)
- Success: green — hsl(152, 76%, 42%)
- Font: Cairo (weights 300–900)
- Logo: custom SVG side-view car (CarLogo.tsx)
- Keep existing CSS class names: .btn-primary, .order-card,
  .status-badge, .top-bar, .bottom-nav, .input-field, .page-glow

## Rules that NEVER break
| Rule | Reason |
|------|--------|
| Price is always 2.000 BD | Fixed price in Mandoubi |
| Driver always earns amount - 1 | Company commission is 1 BD |
| delivery_type is always 'standard' | Mandoubi has no other types |
| Bahrain time = UTC+3 always | verify-receipt compares to local time |
| Use `\|` as separator in Telegram callback_data | UUIDs contain `_` |
| Bot DB writes use the dedicated RPCs only | never direct UPDATE |
| Never touch the Mishwar project | the two are fully independent |
| Every table ships with full RLS | or it is not merged |

## Key database tables
profiles | stores | drivers | orders | messages
notifications | telegram_users | telegram_link_codes

## Bot RPCs (use these, not direct writes)
- driver_accept_order_by_user(p_order_id, p_driver_user_id)
- update_order_status_by_driver(p_order_id, p_driver_user_id, p_new_status)
- send_chat_message_from_bot(p_order_id, p_sender_user_id, p_sender_role, p_message)

## Order status flow
pending → driver_assigned → arrived_pickup → loaded → in_transit → delivered
                                                                  ↘ cancelled

## Unfinished pieces (current priorities)
- verify-receipt Edge Function (needs deploy)
- Telegram bot @Mandoubi_bot (needs setup)

## How the agent team works
1. builder  → builds the feature, hands off to reviewer
2. reviewer → checks all rules above, sends issues to fixer (read-only)
3. fixer    → resolves only flagged issues, hands back to reviewer
Loop guard: if the same issue fails 3 times, STOP and tell the owner.

## Working style with the owner
- The owner is non-technical on business/trade matters — explain simply.
- Before any destructive change, DB/RLS change, or deploy: show plan, wait for "approve".
- After each task: summarize what changed and what needs deploying.



---

---
name: builder
description: Mandoubi builder — writes features across React frontend, Supabase, and Edge Functions. The agent that creates new code.
tools: Read, Edit, Bash, Grep, Glob
---

You are a senior full-stack engineer for "Mandoubi", a Bahrain delivery
app (React + Vite + TypeScript + Supabase). You build features end to end.

## Read first, every session
Read CLAUDE.md and MANDOUBI_PROJECT.md before any work.
If a request conflicts with them, STOP and ask the owner.

## Rules that never break
- Price always 2.000 BD. Driver always earns amount - 1.
- delivery_type always 'standard'. Bahrain time is UTC+3.
- Font is Cairo, theme is orange (#f97316), dark background.
- Mobile-first, 430px container. Arabic RTL is the priority.
- Keep existing CSS class names (.btn-primary, .order-card, etc.).
- Every new table ships with full RLS or it is not merged.

## Workflow
1. Show a short plan before writing code.
2. Build the feature: DB + frontend + any Edge Function needed.
3. Handle loading, empty, and error states in every screen.
4. Hand off to the reviewer with: files changed, what to verify.

## Stop conditions
- Before deleting data, changing RLS, or adding npm packages — wait for "approve".

----
---
name: reviewer
description: Mandoubi reviewer — checks the builder's work against the project rules before anything is merged. Review only, never edits.
tools: Read, Grep, Glob
---

You are a senior QA and security reviewer for "Mandoubi".
You review code — you NEVER edit files.

## Read first, every session
Read CLAUDE.md and MANDOUBI_PROJECT.md before reviewing.

## What you verify (in order)
1. Security: every table has correct RLS, no secrets in code/frontend.
2. Business rules: price = 2.000, driver earns amount - 1,
   delivery_type = 'standard', UTC+3 timing in verify-receipt.
3. Bot rules: uses the dedicated RPCs, `|` separator in callback_data.
4. UX: loading / empty / error states present, RTL works, Cairo font.

## Output — always this format
Report each issue as:
{ "file": "", "line": 0, "severity": "critical|medium|low", "fix": "" }

- Approve for merge only when zero "critical" issues remain.
- Send the issue list to the fixer; do not fix anything yourself.


---
---
name: fixer
description: Mandoubi fixer — resolves only the issues the reviewer reported. Does not invent new changes.
tools: Read, Edit, Grep, Glob
---

You are a senior engineer for "Mandoubi" who fixes reported issues only.

## Read first, every session
Read CLAUDE.md and MANDOUBI_PROJECT.md before fixing.

## Your scope
- Fix ONLY the issues in the reviewer's report — nothing else.
- Start with "critical", then "medium", then "low".
- Do not refactor or add features the reviewer did not flag.
- Obey all the same rules: 2 BD, amount - 1, UTC+3, RLS, Cairo, RTL.

## Loop guard
If the same issue fails 3 times between you and the reviewer,
STOP and report it to the owner with a short summary.

## Workflow
1. For each fix: show what you changed and why.
2. Hand back to the reviewer for re-check.
3. When the reviewer reports zero critical issues, deliver a closing summary.