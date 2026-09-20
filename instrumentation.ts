// Scheduling runs in the single Cloudflare Worker. Keeping the application
// process free of timers avoids duplicate scans after Render restarts/scales.
export async function register(){}
