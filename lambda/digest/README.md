# Chronicle Weekly Digest Lambda

## What This Does

This AWS Lambda function runs every Sunday at 8am UTC. It reads all non-digest `journal_entries` created in the past 7 days, groups them by user, and inserts a single digest entry per user summarizing their week's writing.

The Lambda uses the Supabase **service-role key**, which bypasses Row Level Security (RLS) so it can read every user's entries. **Never expose this key in client-side code.**

---

## Deployment

### 1. Install Dependencies

```bash
cd lambda/digest
npm install
```

### 2. Zip the Package

From inside the `lambda/digest` directory, zip everything (including `node_modules`):

```bash
zip -r ../digest.zip .
```

### 3. Create the Lambda in AWS

1. Open the [AWS Lambda console](https://console.aws.amazon.com/lambda).
2. Click **Create function** > **Author from scratch**.
3. Settings:
   - **Function name:** `chronicle-weekly-digest`
   - **Runtime:** Node.js 20.x
   - **Architecture:** arm64 (or x86_64)
4. Click **Create function**.

### 4. Upload the Zip

In the Lambda console for your new function:

1. Under **Code source**, click **Upload from** > **.zip file**.
2. Upload `lambda/digest.zip`.
3. Set the **Handler** to `index.handler`.

---

## Required Environment Variables

In the Lambda console, go to **Configuration > Environment variables** and add:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key from Supabase **Settings > API** — bypasses RLS |

> **Security note:** The service-role key grants full database access. Store it as a Lambda environment variable (optionally backed by AWS Secrets Manager) and never commit it to source control.

---

## EventBridge Schedule (cron trigger)

1. In the Lambda console, click **Add trigger**.
2. Select **EventBridge (CloudWatch Events)**.
3. Choose **Create a new rule** and configure:
   - **Rule name:** `chronicle-digest-weekly`
   - **Rule type:** Schedule expression
   - **Schedule expression:** `cron(0 8 ? * SUN *)`
4. Click **Add**.

This fires every Sunday at 08:00 UTC.

---

## Manual Testing

1. Open your Lambda function in the AWS console.
2. Click the **Test** tab.
3. Create a new test event with an empty JSON body: `{}`
4. Click **Test** and check the **Execution results** and **CloudWatch Logs** for output.

Expected success output:
```
Created N digest(s)
```

If there are no journal entries in the past 7 days:
```
No entries to digest
```
