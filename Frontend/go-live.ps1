$log = "$PSScriptRoot\tunnel.log"
Remove-Item $log -ErrorAction SilentlyContinue
Start-Process cloudflared -ArgumentList "tunnel","--url","http://localhost:8080" -RedirectStandardError $log -WindowStyle Hidden

$url = $null
for ($i = 0; $i -lt 30 -and -not $url; $i++) {
  Start-Sleep 2
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
}
if (-not $url) { Write-Error "Tunnel URL not found, check tunnel.log"; exit 1 }

Write-Host "Tunnel: $url"
$url | npx wrangler pages secret put BACKEND_URL --project-name prism
npx wrangler pages deploy dist --project-name prism