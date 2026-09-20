# changedetection.io worker

The worker only detects changes. Configure notifications to POST JSON to `https://www.myarea.website/api/webhooks/changedetection` with headers `Content-Type: application/json` and `X-Webhook-Secret: <CHANGEDETECTION_WEBHOOK_SECRET>`.

```json
{"source":"{{watch_title}}","sourceUrl":"{{watch_url}}","capturedAt":"{{current_timestamp}}","content":"{{diff}}","changeType":"PAGE_CHANGED"}
```

Initial watches: one Ktown4u page, one Weverse Shop page, and one publicly accessible domestic store page. Start with a 6-hour interval and only monitor pages whose access terms permit it. Protect the UI behind HTTPS and a strong password.
