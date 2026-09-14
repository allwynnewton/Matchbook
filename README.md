# Matchbook

A private, mobile-friendly matrimonial profile organizer built with Next.js and Supabase.

## Features

- Paste and parse numbered WhatsApp profiles
- Review and edit extracted information before saving
- Browse, search and filter saved profiles
- Shortlist, mark contacted, review later or not interested
- Upload multiple private photos
- Add timestamped private comments
- Edit and permanently delete profiles
- Supabase Row Level Security for owner-only access
- Demo mode using browser storage when Supabase is not configured

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
4. Add the project URL and anon key to `.env.local`.
5. Create a user in Supabase Authentication.
6. Run `npm run dev`.

Without environment variables, the app starts in demo mode and stores profiles only in the current browser.

## Deploy to Vercel

Import the repository into Vercel and add both environment variables from `.env.example`. Run the SQL schema once in Supabase before using the connected version.
