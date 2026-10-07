param([ValidateSet('setup', 'start', 'stop', 'status')][string]$Action = 'status')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$localRoot = Join-Path $workspace '.local'
$runtimeRoot = Join-Path $localRoot 'postgres-runtime'
$bin = Join-Path $runtimeRoot 'pgsql\bin'
$data = Join-Path $localRoot 'postgres\data'
$log = Join-Path $localRoot 'postgres\server.log'
$passwordFile = Join-Path $localRoot 'postgres\password.txt'
$archive = Join-Path $localRoot 'downloads\postgresql-17.11-5-windows-x64-binaries.zip'
$source = 'https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64-binaries.zip'
$port = 54329

function Assert-Success([string]$operation) {
  if ($LASTEXITCODE -ne 0) { throw "$operation failed (exit $LASTEXITCODE). See the local Postgres log." }
}

function Start-LocalDatabase {
  & (Join-Path $bin 'pg_ctl.exe') -D $data status *> $null
  if ($LASTEXITCODE -eq 0) { Write-Output "PostgreSQL already running on loopback:$port"; return }
  & (Join-Path $bin 'pg_ctl.exe') -D $data -l $log -o "-h 127.0.0.1 -p $port" -w start
  Assert-Success 'PostgreSQL startup'
}

if ($Action -eq 'setup') {
  New-Item -ItemType Directory -Force -Path (Join-Path $localRoot 'downloads'), (Join-Path $localRoot 'postgres'), (Join-Path $localRoot 'documents') | Out-Null
  if (-not (Test-Path -LiteralPath (Join-Path $bin 'initdb.exe'))) {
    if (-not (Test-Path -LiteralPath $archive)) {
      Write-Output 'Downloading official EDB PostgreSQL 17.11-5 Windows x64 binaries into .local (approximately 382 MB).'
      $partialArchive = $archive + '.partial'
      Invoke-WebRequest -Uri $source -OutFile $partialArchive -TimeoutSec 600
      Move-Item -LiteralPath $partialArchive -Destination $archive
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($archive)
    try {
      foreach ($entry in $zip.Entries) {
        # Only database runtime files; omit pgAdmin, stack builder and optional tools.
        if ($entry.FullName -notmatch '^pgsql/(bin|lib|share)/' -or $entry.FullName.EndsWith('/')) { continue }
        $target = [IO.Path]::GetFullPath((Join-Path $runtimeRoot $entry.FullName))
        $boundary = [IO.Path]::GetFullPath($runtimeRoot) + [IO.Path]::DirectorySeparatorChar
        if (-not $target.StartsWith($boundary, [StringComparison]::OrdinalIgnoreCase)) { throw 'Archive path escaped local runtime' }
        [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
      }
    } finally { $zip.Dispose() }
  }
  if (-not (Test-Path -LiteralPath (Join-Path $runtimeRoot 'provenance.txt'))) {
    $hashAlgorithm = [Security.Cryptography.SHA256]::Create()
    $archiveStream = [IO.File]::OpenRead($archive)
    try { $hash = [BitConverter]::ToString($hashAlgorithm.ComputeHash($archiveStream)).Replace('-', '') }
    finally { $archiveStream.Dispose(); $hashAlgorithm.Dispose() }
    [IO.File]::WriteAllText((Join-Path $runtimeRoot 'provenance.txt'), "Source=$source`nArchiveSHA256=$hash`nInstalled=PostgreSQL 17.11-5")
  }
  if (-not (Test-Path -LiteralPath $passwordFile)) {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    [Convert]::ToBase64String($bytes).Replace('+', 'a').Replace('/', 'b').Replace('=', '') | Set-Content -LiteralPath $passwordFile -Encoding Ascii
  }
  if (-not (Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))) {
    & (Join-Path $bin 'initdb.exe') -D $data -U customerbuddy --encoding=UTF8 --locale=C --auth=scram-sha-256 --pwfile=$passwordFile
    Assert-Success 'Database initialization'
  }
  Start-LocalDatabase
  $previousPassword = $env:PGPASSWORD
  try {
    $env:PGPASSWORD = (Get-Content -LiteralPath $passwordFile -Raw).Trim()
    $exists = & (Join-Path $bin 'psql.exe') -h 127.0.0.1 -p $port -U customerbuddy -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = 'customerbuddy'"
    Assert-Success 'Database lookup'
    if ($exists -ne '1') {
      & (Join-Path $bin 'createdb.exe') -h 127.0.0.1 -p $port -U customerbuddy customerbuddy
      Assert-Success 'Database creation'
    }
    $envPath = Join-Path $workspace '.env'
    if (-not (Test-Path -LiteralPath $envPath)) {
      $template = [IO.File]::ReadAllText((Join-Path $workspace '.env.example'))
      [IO.File]::WriteAllText($envPath, $template.Replace('GENERATE_WITH_DB_SETUP', $env:PGPASSWORD))
      Write-Output 'Generated ignored .env with a random local database password.'
    }
  } finally { $env:PGPASSWORD = $previousPassword }
  Write-Output "Local database ready: 127.0.0.1:$port/customerbuddy (no business schema yet)."
  exit 0
}

if (-not (Test-Path -LiteralPath (Join-Path $bin 'pg_ctl.exe')) -or -not (Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))) {
  throw 'Local PostgreSQL is not initialized. Run pnpm db:setup first.'
}
switch ($Action) {
  'start' { Start-LocalDatabase }
  'stop' {
    & (Join-Path $bin 'pg_ctl.exe') -D $data status *> $null
    if ($LASTEXITCODE -eq 0) {
      & (Join-Path $bin 'pg_ctl.exe') -D $data -m fast -w stop
      Assert-Success 'PostgreSQL shutdown'
    } else { Write-Output 'PostgreSQL is already stopped.' }
  }
  'status' { & (Join-Path $bin 'pg_ctl.exe') -D $data status; exit $LASTEXITCODE }
}
