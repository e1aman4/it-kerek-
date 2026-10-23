param(
  [int]$Port = 8765
)

$ErrorActionPreference = "Stop"
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$dataDirectory = Join-Path $root "data"
$siteDataPath = Join-Path $dataDirectory "site-data.json"
$analyticsPath = Join-Path $dataDirectory "analytics.jsonl"
$authPath = Join-Path $dataDirectory "admin-auth.json"
$sessions = @{}
$loginAttempts = @{}
$sessionLifetimeSeconds = 28800
$passwordIterations = 310000
$analyticsCount = 0

if (-not (Test-Path -LiteralPath $siteDataPath -PathType Leaf)) {
  throw "Missing site data file: $siteDataPath"
}
if (-not (Test-Path -LiteralPath $analyticsPath -PathType Leaf)) {
  [IO.File]::WriteAllText($analyticsPath, "", [Text.UTF8Encoding]::new($false))
}
$analyticsCount = [IO.File]::ReadAllLines($analyticsPath, [Text.Encoding]::UTF8).Count

function New-PasswordRecord([string]$Password) {
  $salt = New-Object byte[] 16
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($salt) } finally { $generator.Dispose() }
  $deriver = [Security.Cryptography.Rfc2898DeriveBytes]::new($Password, $salt, $passwordIterations)
  try { $hash = $deriver.GetBytes(32) } finally { $deriver.Dispose() }
  return [ordered]@{
    salt = [Convert]::ToBase64String($salt)
    hash = [Convert]::ToBase64String($hash)
    iterations = $passwordIterations
    mustChangePassword = $Password.Length -lt 12
  }
}

function Test-Password([string]$Password, $Record) {
  if ([string]::IsNullOrEmpty($Password) -or $null -eq $Record) { return $false }
  $salt = [Convert]::FromBase64String($Record.salt)
  $expected = [Convert]::FromBase64String($Record.hash)
  $deriver = [Security.Cryptography.Rfc2898DeriveBytes]::new($Password, $salt, [int]$Record.iterations)
  try { $actual = $deriver.GetBytes($expected.Length) } finally { $deriver.Dispose() }
  $difference = 0
  for ($index = 0; $index -lt $expected.Length; $index++) {
    $difference = $difference -bor ($expected[$index] -bxor $actual[$index])
  }
  return $difference -eq 0
}

function Save-PasswordRecord([string]$Password) {
  $json = (New-PasswordRecord $Password | ConvertTo-Json -Compress)
  Write-AtomicFile $authPath $json
}

function Write-AtomicFile([string]$Path, [string]$Text) {
  $temporary = "$Path.$([Guid]::NewGuid().ToString('N')).tmp"
  [IO.File]::WriteAllText($temporary, $Text, [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporary -Destination $Path -Force
}

if (Test-Path -LiteralPath $authPath -PathType Leaf) {
  $passwordRecord = Get-Content -LiteralPath $authPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($passwordRecord.PSObject.Properties.Name -notcontains "mustChangePassword") {
    $passwordRecord | Add-Member -NotePropertyName mustChangePassword -NotePropertyValue $true
    Write-AtomicFile $authPath ($passwordRecord | ConvertTo-Json -Compress)
  }
} else {
  $initialPassword = $env:ITKEREK_ADMIN_PASSWORD
  if ([string]::IsNullOrWhiteSpace($initialPassword)) {
    $securePassword = Read-Host "Create the initial IT-Kerek admin password" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try { $initialPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
  }
  if ([string]::IsNullOrWhiteSpace($initialPassword)) { throw "The initial admin password cannot be empty." }
  Save-PasswordRecord $initialPassword
  $passwordRecord = Get-Content -LiteralPath $authPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $initialPassword = $null
  $env:ITKEREK_ADMIN_PASSWORD = $null
  Write-Host "Initial admin password hash saved; the plaintext password was not written to disk." -ForegroundColor Green
}

function Write-Json($Context, [int]$Status, $Value) {
  $Context.Response.StatusCode = $Status
  $Context.Response.ContentType = "application/json; charset=utf-8"
  $Context.Response.Headers["Cache-Control"] = "no-store"
  $bytes = [Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 32 -Compress))
  $Context.Response.ContentLength64 = $bytes.Length
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Read-JsonBody($Context, [int]$MaxBytes = 1048576) {
  if ($Context.Request.ContentLength64 -gt $MaxBytes) { throw "Request body is too large." }
  $reader = [IO.StreamReader]::new($Context.Request.InputStream, [Text.Encoding]::UTF8)
  try { $text = $reader.ReadToEnd() } finally { $reader.Dispose() }
  if ([string]::IsNullOrWhiteSpace($text)) { throw "A JSON request body is required." }
  return ($text | ConvertFrom-Json)
}

function Get-SessionToken($Context) {
  foreach ($cookie in $Context.Request.Cookies) {
    if ($cookie.Name -eq "itkerek_session") { return $cookie.Value }
  }
  return $null
}

function Test-AdminSession($Context) {
  $token = Get-SessionToken $Context
  if (-not $token -or -not $sessions.ContainsKey($token)) { return $false }
  if ($sessions[$token] -lt [DateTime]::UtcNow) {
    $sessions.Remove($token)
    return $false
  }
  return $true
}

function Test-SameOrigin($Context) {
  if ($Context.Request.Headers["X-Admin-Request"] -ne "1") { return $false }
  $origin = $Context.Request.Headers["Origin"]
  if ([string]::IsNullOrWhiteSpace($origin)) { return $false }
  $expected = "http://127.0.0.1:$Port"
  return $origin -eq $expected
}

function Get-RequestJson($Context, [int]$MaxBytes = 1048576) {
  return Read-JsonBody $Context $MaxBytes
}

function Save-SiteData($Value) {
  foreach ($key in @("services", "products", "addOns", "projects")) {
    if ($null -eq $Value.$key -or $Value.$key -isnot [System.Array]) {
      throw "Invalid site data: '$key' must be a list."
    }
  }
  if ($Value.services.Count -gt 40 -or $Value.products.Count -gt 40 -or $Value.addOns.Count -gt 40 -or $Value.projects.Count -gt 100) {
    throw "The site data contains too many records."
  }
  if ($null -eq $Value.home -or $null -eq $Value.home.stats -or $Value.home.stats.Count -gt 6) {
    throw "Invalid homepage settings."
  }
  foreach ($product in $Value.products) {
    if ([string]::IsNullOrWhiteSpace($product.id) -or [string]::IsNullOrWhiteSpace($product.title) -or $null -eq $product.price -or [double]$product.price -lt 0 -or [double]$product.price -gt 100000000) {
      throw "A product has invalid fields or price."
    }
  }
  foreach ($option in $Value.addOns) {
    if ([string]::IsNullOrWhiteSpace($option.id) -or $null -eq $option.price -or [double]$option.price -lt 0 -or [double]$option.price -gt 100000000) {
      throw "An additional option has an invalid ID or price."
    }
  }
  foreach ($service in $Value.services) {
    if ([string]::IsNullOrWhiteSpace($service.slug) -or [string]::IsNullOrWhiteSpace($service.title) -or [double]$service.price -lt 0 -or [double]$service.price -gt 100000000) {
      throw "A service has invalid fields or price."
    }
  }
  foreach ($count in @("4", "8", "16")) {
    if ($Value.cameraPricing.PSObject.Properties.Name -notcontains $count) { throw "Camera pricing is incomplete." }
    if ($count -ne "16" -and $null -eq $Value.cameraPricing.$count) { throw "A required camera package price cannot be empty." }
    if ($null -ne $Value.cameraPricing.$count -and ([double]$Value.cameraPricing.$count -lt 0 -or [double]$Value.cameraPricing.$count -gt 100000000)) {
      throw "A camera package has an invalid price."
    }
  }
  $json = $Value | ConvertTo-Json -Depth 32
  Write-AtomicFile $siteDataPath $json
  return ($json | ConvertFrom-Json)
}

function Get-AnalyticsSummary([int]$Days) {
  $now = [DateTime]::UtcNow
  $localNow = $now.ToLocalTime()
  $start = $now.AddDays(-$Days)
  $previousStart = $start.AddDays(-$Days)
  $all = @()
  foreach ($line in [IO.File]::ReadAllLines($analyticsPath, [Text.Encoding]::UTF8)) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    try { $all += $line | ConvertFrom-Json } catch { Write-Warning "Skipping a malformed analytics record." }
  }
  $current = @($all | Where-Object { [DateTime]$_.timestamp -ge $start })
  $previousEvents = @($all | Where-Object { [DateTime]$_.timestamp -ge $previousStart -and [DateTime]$_.timestamp -lt $start })
  $views = @($current | Where-Object type -eq "page_view")
  $clicks = @($current | Where-Object type -eq "click")
  $previousViews = @($previousEvents | Where-Object type -eq "page_view")
  $previousClicks = @($previousEvents | Where-Object type -eq "click")
  $ctaPattern = "(?i)(оставить|обсудить|заказать|рассчитать|получить|связаться|выбрать|отправить|contact|order|quote)"
  $daily = @()
  for ($offset = $Days - 1; $offset -ge 0; $offset--) {
    $date = $localNow.Date.AddDays(-$offset)
    $dayEvents = @($current | Where-Object { ([DateTime]$_.timestamp).ToLocalTime().Date -eq $date.Date })
    $daily += [pscustomobject]@{
      date = $date.ToString("dd MMM yyyy")
      shortDate = if ($Days -gt 30 -and $offset % 7 -ne 0 -and $offset -ne 0) { "" } else { $date.ToString("dd.MM") }
      views = @($dayEvents | Where-Object type -eq "page_view").Count
      clicks = @($dayEvents | Where-Object type -eq "click").Count
    }
  }
  $topPages = @($views | Group-Object path | Sort-Object Count -Descending | Select-Object -First 6 | ForEach-Object {
    [pscustomobject]@{ path = $_.Name; views = $_.Count }
  })
  $topClicks = @($clicks | Group-Object { "$($_.label)`n$($_.path)" } | Sort-Object Count -Descending | Select-Object -First 6 | ForEach-Object {
    $parts = $_.Name -split "`n", 2
    [pscustomobject]@{ label = $parts[0]; path = $parts[1]; count = $_.Count }
  })
  $recent = @($current | Sort-Object { [DateTime]$_.timestamp } -Descending | Select-Object -First 18 | ForEach-Object {
    [pscustomobject]@{
      type = $_.type
      path = $_.path
      label = $_.label
      time = ([DateTime]$_.timestamp).ToLocalTime().ToString("dd.MM HH:mm")
    }
  })
  return [pscustomobject]@{
    views = $views.Count
    clicks = $clicks.Count
    ctaClicks = @($clicks | Where-Object { $_.label -match $ctaPattern }).Count
    clickRate = if ($views.Count) { [Math]::Round($clicks.Count / $views.Count * 100, 1) } else { 0 }
    previous = [pscustomobject]@{ views = $previousViews.Count; clicks = $previousClicks.Count }
    daily = $daily
    topPages = $topPages
    topClicks = $topClicks
    recent = $recent
  }
}

function Write-StaticFile($Context, [string]$RequestPath) {
  $relativePath = [Uri]::UnescapeDataString($RequestPath.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar))
  if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = "index.html" }
  $fullPath = [IO.Path]::GetFullPath((Join-Path $root $relativePath))
  $prefix = $root.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if (-not $fullPath.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -and $fullPath -ne (Join-Path $root "index.html")) {
    Write-Json $Context 403 @{ error = "Forbidden." }
    return
  }
  if (Test-Path -LiteralPath $fullPath -PathType Container) { $fullPath = Join-Path $fullPath "index.html" }
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    Write-Json $Context 404 @{ error = "Not found." }
    return
  }
  $extension = [IO.Path]::GetExtension($fullPath).ToLowerInvariant()
  $mime = switch ($extension) {
    ".html" { "text/html; charset=utf-8" }
    ".js" { "text/javascript; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".svg" { "image/svg+xml" }
    ".ico" { "image/x-icon" }
    default { "application/octet-stream" }
  }
  $Context.Response.StatusCode = 200
  $Context.Response.ContentType = $mime
  $Context.Response.Headers["Cache-Control"] = "no-store"
  if ($extension -eq ".html") {
    $Context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://nova-code-bishkek.nova-code-kg.workers.dev; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'"
    $Context.Response.Headers["X-Frame-Options"] = "DENY"
    $Context.Response.Headers["Referrer-Policy"] = "no-referrer"
  }
  $bytes = [IO.File]::ReadAllBytes($fullPath)
  $Context.Response.ContentLength64 = $bytes.Length
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Host "IT-Kerek is available at http://127.0.0.1:$Port/" -ForegroundColor Green
Write-Host "Admin panel: http://127.0.0.1:$Port/admin/ (local computer only)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor DarkGray

while ($listener.IsListening) {
  $context = $null
  try {
    $context = $listener.GetContext()
    $request = $context.Request
    $requestPath = $request.Url.AbsolutePath.TrimEnd("/")
    if ([string]::IsNullOrEmpty($requestPath)) { $requestPath = "/" }

    if ($requestPath -eq "/api/analytics" -and $request.HttpMethod -eq "POST") {
      try {
        $event = Read-JsonBody $context 4096
        if ($event.type -notin @("page_view", "click")) { Write-Json $context 400 @{ error = "Invalid event type." }; continue }
        $eventPath = [string]$event.path
        if ($eventPath -notmatch "^/(?:[A-Za-z0-9_-]+/)*$") { $eventPath = "/" }
        $label = ([string]$event.label -replace "[\x00-\x1F]", " ").Trim()
        if ($label.Length -gt 80) { $label = $label.Substring(0, 80) }
        $record = [pscustomobject]@{ type = [string]$event.type; path = $eventPath; label = if ($event.type -eq "click") { $label } else { "" }; timestamp = [DateTime]::UtcNow.ToString("o") }
        [IO.File]::AppendAllText($analyticsPath, (($record | ConvertTo-Json -Compress) + [Environment]::NewLine), [Text.UTF8Encoding]::new($false))
        $analyticsCount++
        if ($analyticsCount -ge 50500) {
          $lines = [IO.File]::ReadAllLines($analyticsPath, [Text.Encoding]::UTF8)
          $retained = $lines | Select-Object -Last 40000
          Write-AtomicFile $analyticsPath ([string]::Join([Environment]::NewLine, $retained) + [Environment]::NewLine)
          $analyticsCount = $retained.Count
        }
        $Context.Response.StatusCode = 204
        $Context.Response.ContentLength64 = 0
      } catch {
        Write-Warning "Analytics event rejected: $($_.Exception.Message)"
        Write-Json $context 400 @{ error = "Analytics event could not be recorded." }
      }
      continue
    }

    if ($requestPath -eq "/api/public-data" -and $request.HttpMethod -eq "GET") {
      $context.Response.StatusCode = 200
      $context.Response.ContentType = "application/json; charset=utf-8"
      $context.Response.Headers["Cache-Control"] = "no-store"
      $bytes = [IO.File]::ReadAllBytes($siteDataPath)
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      continue
    }

    if ($requestPath -eq "/api/admin/login" -and $request.HttpMethod -eq "POST") {
      if (-not (Test-SameOrigin $context)) { Write-Json $context 403 @{ error = "Запрос отклонён проверкой источника." }; continue }
      $address = $request.RemoteEndPoint.Address.ToString()
      $now = [DateTime]::UtcNow
      if (-not $loginAttempts.ContainsKey($address)) { $loginAttempts[$address] = @() }
      $loginAttempts[$address] = @($loginAttempts[$address] | Where-Object { $_ -gt $now.AddMinutes(-15) })
      if ($loginAttempts[$address].Count -ge 5) { Write-Json $context 429 @{ error = "Слишком много попыток. Подождите 15 минут." }; continue }
      $body = Read-JsonBody $context 4096
      if (-not (Test-Password ([string]$body.password) $passwordRecord)) {
        $loginAttempts[$address] += $now
        Write-Json $context 401 @{ error = "Неверный пароль." }
        continue
      }
      $loginAttempts.Remove($address)
      $tokenBytes = New-Object byte[] 32
      $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
      try { $generator.GetBytes($tokenBytes) } finally { $generator.Dispose() }
      $token = [Convert]::ToBase64String($tokenBytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
      $sessions[$token] = [DateTime]::UtcNow.AddSeconds($sessionLifetimeSeconds)
      $cookie = "itkerek_session=$token; Path=/; HttpOnly; SameSite=Strict; Max-Age=$sessionLifetimeSeconds"
      if ($request.IsSecureConnection) { $cookie += "; Secure" }
      $context.Response.Headers.Add("Set-Cookie", $cookie)
      Write-Json $context 200 @{ ok = $true }
      continue
    }

    if ($requestPath.StartsWith("/api/admin/")) {
      if (-not (Test-AdminSession $context)) { Write-Json $context 401 @{ error = "Войдите в панель администратора." }; continue }
      if ($request.HttpMethod -in @("PUT", "POST", "DELETE") -and -not (Test-SameOrigin $context)) {
        Write-Json $context 403 @{ error = "Запрос отклонён проверкой источника." }
        continue
      }
      switch -Regex ($requestPath) {
        "^/api/admin/security$" {
          if ($request.HttpMethod -ne "GET") { Write-Json $context 405 @{ error = "Method not allowed." }; continue }
          Write-Json $context 200 @{ mustChangePassword = [bool]$passwordRecord.mustChangePassword }
          continue
        }
        "^/api/admin/analytics$" {
          if ($request.HttpMethod -ne "GET") { Write-Json $context 405 @{ error = "Method not allowed." }; continue }
          $days = 30
          if ($request.QueryString["days"] -match "^(7|30|90)$") { $days = [int]$request.QueryString["days"] }
          Write-Json $context 200 (Get-AnalyticsSummary $days)
          continue
        }
        "^/api/admin/data$" {
          if ($request.HttpMethod -eq "GET") {
            $bytes = [IO.File]::ReadAllBytes($siteDataPath)
            $context.Response.StatusCode = 200
            $context.Response.ContentType = "application/json; charset=utf-8"
            $context.Response.Headers["Cache-Control"] = "no-store"
            $context.Response.ContentLength64 = $bytes.Length
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
          } elseif ($request.HttpMethod -eq "PUT") {
            try {
              $updated = Save-SiteData (Get-RequestJson $context)
              Write-Json $context 200 $updated
            } catch { Write-Json $context 400 @{ error = $_.Exception.Message } }
          } else { Write-Json $context 405 @{ error = "Method not allowed." } }
          continue
        }
        "^/api/admin/password$" {
          if ($request.HttpMethod -ne "PUT") { Write-Json $context 405 @{ error = "Method not allowed." }; continue }
          $body = Read-JsonBody $context 4096
          if (-not (Test-Password ([string]$body.currentPassword) $passwordRecord)) { Write-Json $context 403 @{ error = "Текущий пароль указан неверно." }; continue }
          if ([string]$body.newPassword -match "\s" -or ([string]$body.newPassword).Length -lt 12) { Write-Json $context 400 @{ error = "Новый пароль должен содержать не менее 12 символов и не содержать пробелы." }; continue }
          Save-PasswordRecord ([string]$body.newPassword)
          $passwordRecord = Get-Content -LiteralPath $authPath -Raw -Encoding UTF8 | ConvertFrom-Json
          Write-Json $context 200 @{ ok = $true }
          continue
        }
        "^/api/admin/logout$" {
          if ($request.HttpMethod -ne "POST") { Write-Json $context 405 @{ error = "Method not allowed." }; continue }
          $token = Get-SessionToken $context
          if ($token) { $sessions.Remove($token) }
          $context.Response.Headers.Add("Set-Cookie", "itkerek_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0")
          Write-Json $context 200 @{ ok = $true }
          continue
        }
        default { Write-Json $context 404 @{ error = "Not found." }; continue }
      }
      continue
    }

    if ($request.HttpMethod -notin @("GET", "HEAD")) { Write-Json $context 405 @{ error = "Method not allowed." }; continue }
    Write-StaticFile $context $requestPath
  } catch {
    Write-Warning "Request failed: $($_.Exception.Message)"
    if ($null -ne $context -and -not $context.Response.OutputStream.CanWrite) { continue }
    if ($null -ne $context) {
      try {
        if (-not $context.Response.OutputStream.CanWrite) { continue }
        Write-Json $context 500 @{ error = "Internal server error." }
      } catch { }
    }
  } finally {
    if ($null -ne $context) {
      try { $context.Response.Close() } catch { }
    }
  }
}
