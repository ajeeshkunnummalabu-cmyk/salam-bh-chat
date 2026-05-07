# Salam Bahrain Travel Chat

Real-time multilingual chat app for travel agencies. Built with React + Vite + Supabase.

## Features

- **Real-time chat** between customers and staff (powered by Supabase Realtime)
- **Auto translation** (Arabic, Hindi, Malayalam, English) using MyMemory free API
- **PNR parser** for Galileo flight quotes
- **Bank transfer card** with NBB details for manual payments
- **Continue on WhatsApp** button for customers
- **Lead pipeline** (New → Quoted → Paid → Ticketed → Done)
- **AI-suggested replies** for staff
- **Mobile-responsive** WhatsApp-style UI

## Demo logins

- Customer: no login (just enter name + phone)
- Staff: `layla` / `demo`
- Admin: `admin` / `admin`

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000

## Deployment to Vercel

1. Push this folder to a GitHub repo
2. Go to https://vercel.com → Import Project → select your repo
3. In Vercel project settings → Environment Variables, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_KEY` = your Supabase publishable key
4. Click Deploy
5. Vercel auto-deploys on every push to main

## Database setup

The Supabase database schema is in `../supabase-setup.sql`. Run it once in Supabase SQL Editor before first launch.

## Configuration

Edit `src/App.jsx` line ~14 to change:
- Business name
- WhatsApp number
- Bank details
