# grical-to-mobilizon

Requirements:
- node 18+
- Mobilizon account with access to the group
- pnpm (`npm i -g pnpm`)

# Setup

Create `creds.json` containing `{ email: "your-email@..", password: "your-password" }`

Run `pnpm new-session` to create a session.json

You can now delete `creds.json`. Adjust the actor id in `session.json` if you want to use another actor.

Run `pnpm start` regularly.
