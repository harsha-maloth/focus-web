# Commands log

Part 1 (sections 1 to 7) is the Android reference research in Windows PowerShell; paths assume `C:\Users\<you>\Downloads`. The web repo commands are in the section at the end.

## 1. Report what is inside an APK/zip (no extraction)

Purpose: see file types, folders and largest files, so you know the stack before opening anything.

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $env:USERPROFILE "Downloads\NAME.zip"
$out = Join-Path $env:USERPROFILE "Desktop\NAME_report.txt"
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$files = $zip.Entries | Where-Object { $_.Length -gt 0 }

"=== BY FILE TYPE ===" | Out-File $out
$files | Group-Object { [IO.Path]::GetExtension($_.Name).ToLower() } |
  ForEach-Object { [pscustomobject]@{ Ext=$_.Name; Files=$_.Count; SizeMB=[math]::Round((($_.Group | Measure-Object Length -Sum).Sum)/1MB,2) } } |
  Sort-Object SizeMB -Descending | Format-Table -AutoSize | Out-String -Width 300 | Out-File $out -Append

"=== 80 LARGEST FILES ===" | Out-File $out -Append
$files | Sort-Object Length -Descending | Select-Object -First 80 @{n='SizeKB';e={[math]::Round($_.Length/1KB,1)}}, FullName |
  Format-Table -AutoSize | Out-String -Width 300 | Out-File $out -Append
$zip.Dispose(); notepad $out
```

Notes: when pasting into PowerShell, multi-line commands can get cut off (a `>>` prompt means it is waiting for more). Cancel with Ctrl+C and paste as single lines.

## 2. Extract specific files from a zip

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("$env:USERPROFILE\Downloads\NAME.zip")
$dest = Join-Path $env:USERPROFILE "Downloads\work"; New-Item -ItemType Directory -Force $dest | Out-Null
foreach ($name in "path/inside/zip/file1","path/inside/zip/file2") {
  $e = $zip.GetEntry($name)
  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, (Join-Path $dest (Split-Path $name -Leaf)), $true)
}
$zip.Dispose()
```

## 3. List app class names straight from dex files (no JADX needed)

Purpose: see the package/class structure of a native Android app.

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("$env:USERPROFILE\Downloads\NAME.zip")
$set = New-Object System.Collections.Generic.HashSet[string]
foreach ($n in "classes.dex","classes2.dex","classes3.dex") {
  $s = $zip.GetEntry($n).Open(); $ms = New-Object IO.MemoryStream; $s.CopyTo($ms); $s.Close()
  $txt = [Text.Encoding]::GetEncoding(28591).GetString($ms.ToArray())
  foreach ($m in [regex]::Matches($txt, 'L[a-zA-Z0-9_/$]{6,200};')) { [void]$set.Add($m.Value.Substring(1, $m.Value.Length - 2)) }
}
$zip.Dispose()
$lib = '^(androidx|android|kotlin|kotlinx|java|javax|dalvik|sun|org|io|okhttp3|okio|retrofit2|coil|dagger|com/google|com/airbnb|com/android|com/facebook|com/squareup|com/bumptech|com/revenuecat|com/appsflyer|com/adjust|com/clevertap|com/onesignal|j\$)/'
$app = $set | Where-Object { $_ -notmatch $lib -and $_ -match '/' } | Sort-Object
$app | Out-File "$env:USERPROFILE\Desktop\NAME_classes.txt"
$app | ForEach-Object { ($_.Split('/') | Select-Object -First 3) -join '/' } | Group-Object | Sort-Object Count -Descending | Select-Object -First 40 | Format-Table Count, Name -AutoSize | Out-String -Width 200
```

## 4. Filter the class list for specific modules

```powershell
Select-String -Path "$env:USERPROFILE\Desktop\NAME_classes.txt" -Pattern 'PACKAGE/(services|workers|core)/' | ForEach-Object { $_.Line -replace '^.*PACKAGE/','' } | Where-Object { $_ -notmatch '\$' } | Select-Object -First 150
```

## 5. IL2CPP dump (Unity games only; not completed for BitLife)

Needs Il2CppDumper from GitHub. Inputs: `libil2cpp.so` and `global-metadata.dat`. Output: `dump.cs` (names only). The command needs those two files extracted first (see command 2).

## 6. Extra extraction: permissions, framework APIs, library versions

Reads `AndroidManifest.xml` strings (binary XML decoded as UTF-16 and Latin-1), framework class references in the dex files, and `*.version` metadata. Writes `regain_extra.txt` to the Desktop.

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("$env:USERPROFILE\Downloads\NAME.zip")
$out = "$env:USERPROFILE\Desktop\NAME_extra.txt"
function Get-Bytes($n) { $e = $zip.GetEntry($n); $s = $e.Open(); $ms = New-Object IO.MemoryStream; $s.CopyTo($ms); $s.Close(); $ms.ToArray() }

$b = Get-Bytes "AndroidManifest.xml"
$t = [Text.Encoding]::Unicode.GetString($b) + " " + [Text.Encoding]::Unicode.GetString($b,1,$b.Length-1) + " " + [Text.Encoding]::GetEncoding(28591).GetString($b)
"=== PERMISSIONS AND ACTIONS (manifest) ===" | Out-File $out
[regex]::Matches($t,'(android\.permission\.[A-Za-z_]+|android\.accessibilityservice\.[A-Za-z_.]+|android\.app\.action\.[A-Za-z_.]+|android\.intent\.action\.[A-Za-z_.]+|android\.settings\.[A-Za-z_.]+)') | ForEach-Object { $_.Value } | Sort-Object -Unique | Out-File $out -Append

$set = New-Object System.Collections.Generic.HashSet[string]
foreach ($n in "classes.dex","classes2.dex","classes3.dex") {
  $d = [Text.Encoding]::GetEncoding(28591).GetString((Get-Bytes $n))
  foreach ($m in [regex]::Matches($d,'Landroid/[A-Za-z0-9_/$]{4,120};')) { [void]$set.Add($m.Value) }
}
"`n=== ANDROID FRAMEWORK CLASSES USED (filtered) ===" | Out-File $out -Append
$set | Where-Object { $_ -match 'accessibility|app/usage|app/admin|AlarmManager|WindowManager|PowerManager|provider/Settings|JobScheduler|NotificationListener|VpnService|LauncherApps|ForegroundService|UsageStats|KeyguardManager|ActivityManager|PackageManager' } | Sort-Object | Out-File $out -Append

"`n=== LIBRARY VERSIONS ===" | Out-File $out -Append
$zip.Entries | Where-Object { $_.Name -like '*.version' } | ForEach-Object { $r = New-Object IO.StreamReader($_.Open()); $v = $r.ReadToEnd().Trim(); $r.Close(); "{0} = {1}" -f ($_.Name -replace '\.version$',''), $v } | Out-File $out -Append
$zip.Dispose(); notepad $out
```

Result summarized in `android-requirements.md`. The framework-class list includes library usage as well as the app's own.

## 7. Screens, ViewModels, repositories and DAOs inventory (from saved class list)

```powershell
Select-String -Path "$env:USERPROFILE\Desktop\NAME_classes.txt" -Pattern 'PACKAGE/.*(Screen|ViewModel|Repository|RepositoryImpl|UseCase|Dao)$' | ForEach-Object { $_.Line -replace '^.*PACKAGE/','' } | Where-Object { $_ -notmatch '\$' } | Out-File "$env:USERPROFILE\Desktop\NAME_structure.txt"; notepad "$env:USERPROFILE\Desktop\NAME_structure.txt"
```

Status: run for Regain. The anchored filter returned nothing because logic classes are obfuscated. Use this looser check instead:

```powershell
$f = "$env:USERPROFILE\Desktop\NAME_classes.txt"
"Total lines: " + (Get-Content $f).Count
Select-String -Path $f -Pattern 'PACKAGE/feature_focus_timer/' | ForEach-Object { $_.Line -replace '^.*PACKAGE/feature_focus_timer/','' } | Where-Object { $_ -notmatch '\$' } | Select-Object -First 120
```

Result recorded in `reference-structure.md`.

## Known issues
- `dump.cs` not found: the dump tool must run first.
- JADX "Save all" was a blocker for the user; command 3 replaces it for structure-only study.
- Never install the reference APKs on a phone (re-signed, modded builds).

## Web repo commands (shell; works in Termux or Linux/macOS, adjust for PowerShell)

Run from the repo root unless stated.

```
# Install and run
cd web && npm install            # creates web/package-lock.json: commit it
npm run dev                      # http://localhost:5173/focus-web/
npm run typecheck && npm test && npm run build    # same checks the deploy workflow runs

# Database (needs the Supabase CLI; tests also need Docker)
supabase link --project-ref <ref>
supabase db push                 # applies supabase/migrations in order
supabase start && supabase test db      # 53 pgTAP assertions

# Check the blank-page fix is present (should print the || lines)
grep -n "||" web/src/lib/supabase.ts

# Check no service_role key anywhere (should only match docs and comments)
grep -rn "service_role" . --exclude-dir=node_modules --exclude=package-lock.json

# Sync merged docs into an existing checkout without losing package-lock.json
git pull
# then copy the changed files over, and:
git add -A && git commit -m "Merge planning docs; fix empty Supabase variables" && git push
```

Health check (read-only, Supabase SQL editor): paste `supabase/checks/health_check.sql` and run. Every row should say PASS or info.

No network is needed for the Supabase SQL editor route: paste each migration file, in order, and run it.

