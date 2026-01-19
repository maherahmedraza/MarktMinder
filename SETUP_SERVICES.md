# Service Setup Guide

This guide explains how to set up the external services required for MarktMinder: Email Notifications and Google OAuth.

---

## 1. Email Service (SMTP)

We recommend using **Resend**, **SendGrid**, or **Brevo** for free transactional emails.
This guide uses **SendGrid** as an example, but any SMTP provider works.

### Step 1: Create an Account
1.  Sign up for a free account at [SendGrid](https://signup.sendgrid.com/) (100 emails/day free).
2.  Verify your email address.

### Step 2: Create an API Key/SMTP Relay
1.  Go to **Settings** > **API Keys**.
2.  Click **Create API Key**.
3.  Name it `MarktMinder Dev` and choose **Full Access**.
4.  Copy the generated key (it starts with `SG.`).

### Step 3: Configure Environment
Update your `backend/.env` file:

```env
# SMPT Settings (SendGrid example)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key_starting_with_SG
SMTP_FROM=noreply@yourverifieddomain.com
```

> **Note**: For development, you often need to verify a "Single Sender Identity" in SendGrid settings to send emails from a specific address (e.g., your personal email).

---

## 2. Google OAuth (Sign in with Google)

### Step 1: Create Google Cloud Project
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Click the project dropdown (top left) and initiate **New Project**.
3.  Name it `MarktMinder-Dev` and create.

### Step 2: Configure OAuth Consent Screen
1.  In the left sidebar, go to **APIs & Services** > **OAuth consent screen**.
2.  Choose **External** user type and create.
3.  Fill in required fields:
    - **App Information**: MarktMinder
    - **User Support Email**: Your email
    - **Developer Contact**: Your email
4.  Click **Save and Continue**.
5.  **Scopes**: Add `userinfo.email` and `userinfo.profile`.
6.  **Test Users**: Add your own email address (important for testing while in "Testing" mode).

### Step 3: Create Credentials
1.  Go to **APIs & Services** > **Credentials**.
2.  Click **Create Credentials** > **OAuth client ID**.
3.  **Application type**: Web application.
4.  **Name**: `MarktMinder Web`.
5.  **Authorized JavaScript origins**:
    - `http://localhost:3000`
6.  **Authorized redirect URIs**:
    - `http://localhost:3001/api/auth/google/callback`
7.  Click **Create**.
8.  Copy the **Client ID** and **Client Secret**.

### Step 4: Configure Environment
Update your `backend/.env` file:

```env
GOOGLE_CLIENT_ID=your_pasted_client_id
GOOGLE_CLIENT_SECRET=your_pasted_client_secret
GOOGLE_CALLBACK_URL=/api/auth/google/callback
```

---

## 3. Push Notifications (VAPID)

We use the Web Push standard, which requires VAPID keys. These are self-generated and free.

### Generation (already done for this project)
Run this command in `backend/`:
```bash
./node_modules/.bin/web-push generate-vapid-keys
```

Add the output to your `.env`:
```env
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

### Testing
1.  Login to dashboard.
2.  Go to Settings.
3.  Toggle "Push Notifications" on.
4.  Allow permission in browser.
