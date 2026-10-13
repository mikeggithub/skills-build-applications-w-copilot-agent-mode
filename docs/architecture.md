# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep the React app focused on rendering and user interaction only; it should fetch from the `/api` endpoints, show loading/empty/error states, and avoid business logic or direct database concerns.
- Logic tier decision: Implement Express routes and service functions in `octofit-tracker/backend/src` so validation, transformation, and aggregate logic live in the server instead of the browser or models.
- Data tier decision: Define the MongoDB schema in Mongoose models with required fields, relationship references, and idempotent seeded fixtures so the API can trust the persisted data model.
- Activity tracking approach: Validate `userId` and `teamId`, reject malformed or missing references with 4xx responses, create a persisted activity with `user`, `team`, `type`, `minutes`, computed `points`, and `occurredAt`, then list the records back to the client.
- Team management approach: Require a non-empty team name and keep team memberships as ObjectId references; the API should return the stored `name`, `mascot`, and member list without leaking raw model internals.
- Leaderboard approach: Aggregate each team’s activity points, sort descending, and assign a 1-based rank so the frontend can render ordered standings deterministically.
- Workout suggestions approach: Look up the user by email, inspect recent activity patterns or fitness goals, and return the highest matching workout suggestion with a clear `reason` while returning a deliberate 4xx for unknown users.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — verifies schema validation rules and seed idempotency for `User`, `Team`, `Activity`, and `Workout`.
- API command: `npm run test:api --prefix octofit-tracker/backend` — validates request handling, validation errors, CRUD behavior, leaderboard aggregation, and workout suggestion logic across all `/api/*` routes.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — checks the React view layers, loading states, empty states, and error alerts when the API is called.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — catches TypeScript or compile-time issues in the Express application after the data and API layers are implemented.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — confirms the Vite/React presentation layer compiles cleanly once the UI and API contracts are wired together.

The current red baseline should be treated as the starting point: the data tests fail on missing required validation, the API tests fail on unimplemented endpoints and wrong 4xx behavior, and the frontend tests fail because the app still renders the placeholder “Implementation pending” state instead of real fetched data.
