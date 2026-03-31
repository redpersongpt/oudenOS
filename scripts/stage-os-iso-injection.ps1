[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$IsoPath,

  [string]$ApbxPath = (Join-Path $PSScriptRoot "..\artifacts\os-apbx-package\redcore-os-template.apbx"),

  [string]$WizardBundlePath = "",

  [string]$WorkingDirectory = (Join-Path $PSScriptRoot "..\artifacts\os-iso-staging"),

  [string]$OutputIsoPath = ""
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required"
  }
}

Require-Command Mount-DiskImage
Require-Command Dismount-DiskImage
Add-Type -AssemblyName System.IO.Compression.FileSystem

$resolvedIso = (Resolve-Path $IsoPath).Path
$resolvedWorking = [System.IO.Path]::GetFullPath($WorkingDirectory)

$isoRoot = Join-Path $resolvedWorking "iso-root"
$packageCarrierRoot = Join-Path $isoRoot "sources\$OEM$\$1\redcore\packages"
$wizardRoot = $null
$mountPath = $null
$mountedImage = $null
$resolvedApbx = $null
$apbxExtractRoot = Join-Path $resolvedWorking "apbx-extracted"
$apbxPackageRoot = $null
$manifest = $null
$staging = $null
$resolvedBundle = $null

if (Test-Path $resolvedWorking) {
  Remove-Item $resolvedWorking -Recurse -Force
}

New-Item -ItemType Directory -Path $isoRoot -Force | Out-Null

try {
  $mountedImage = Mount-DiskImage -ImagePath $resolvedIso -PassThru
  $volume = $mountedImage | Get-Volume
  if (-not $volume.DriveLetter) {
    throw "Mounted ISO did not expose a drive letter"
  }

  $mountPath = "$($volume.DriveLetter):\"
  Copy-Item "$mountPath*" $isoRoot -Recurse -Force
}
finally {
  if ($mountedImage) {
    Dismount-DiskImage -ImagePath $resolvedIso | Out-Null
  }
}

if ($ApbxPath -and (Test-Path $ApbxPath)) {
  $resolvedApbx = (Resolve-Path $ApbxPath).Path
  New-Item -ItemType Directory -Path $apbxExtractRoot -Force | Out-Null
  [System.IO.Compression.ZipFile]::ExtractToDirectory($resolvedApbx, $apbxExtractRoot)

  $packageDirectories = Get-ChildItem -Path $apbxExtractRoot -Directory
  if ($packageDirectories.Count -eq 0) {
    throw "APBX archive did not contain a package directory"
  }

  $apbxPackageRoot = $packageDirectories[0].FullName
  $manifestPath = Join-Path $apbxPackageRoot "manifest.json"
  $stagingPath = Join-Path $apbxPackageRoot "injection\staging.json"

  if (-not (Test-Path $manifestPath)) {
    throw "APBX manifest.json missing from package"
  }
  if (-not (Test-Path $stagingPath)) {
    throw "APBX injection metadata missing from package"
  }

  $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
  $staging = Get-Content $stagingPath -Raw | ConvertFrom-Json

  $injectPath = if ($staging.injectPath) {
    ($staging.injectPath -replace "/", "\")
  }
  else {
    "sources\$OEM$\$1\redcore\wizard"
  }

  $wizardRoot = Join-Path $isoRoot $injectPath
  New-Item -ItemType Directory -Path $wizardRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $packageCarrierRoot -Force | Out-Null

  Copy-Item $resolvedApbx (Join-Path $packageCarrierRoot "redcore-os.apbx") -Force

  $payloadItems = @(
    "manifest.json",
    "wizard",
    "Configuration",
    "injection",
    "meta",
    "payload",
    "state"
  )

  foreach ($item in $payloadItems) {
    $sourcePath = Join-Path $apbxPackageRoot $item
    if (Test-Path $sourcePath) {
      Copy-Item $sourcePath (Join-Path $wizardRoot $item) -Recurse -Force
    }
  }
}
elseif ($WizardBundlePath -and (Test-Path $WizardBundlePath)) {
  $resolvedBundle = (Resolve-Path $WizardBundlePath).Path
  $wizardRoot = Join-Path $isoRoot "sources\$OEM$\$1\redcore\wizard"
  New-Item -ItemType Directory -Path $wizardRoot -Force | Out-Null
  Copy-Item $resolvedBundle (Join-Path $wizardRoot "redcore-os-wizard-playbook.zip") -Force
}
else {
  throw "Provide a valid -ApbxPath or -WizardBundlePath."
}

$metadata = @{
  injectedAt = (Get-Date).ToUniversalTime().ToString("o")
  sourceIso = $resolvedIso
  apbxPackage = $resolvedApbx
  wizardBundle = $resolvedBundle
  manifest = $manifest
  staging = $staging
  injectionRoot = $wizardRoot
  packageCarrierRoot = $packageCarrierRoot
  note = if ($resolvedApbx) {
    "APBX package truth was staged directly into the OEM injection path and package carrier path."
  } else {
    "Legacy wizard bundle staging path was used because no APBX package was supplied."
  }
}

$metadata | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $wizardRoot "redcore-iso-injection.json")

if ($OutputIsoPath) {
  $oscdimg = Get-Command oscdimg -ErrorAction SilentlyContinue
  if (-not $oscdimg) {
    Write-Warning "oscdimg not found. ISO staged at $isoRoot but no rebuilt ISO was produced."
  }
  else {
    & $oscdimg.Source -m -o -u2 -udfver102 $isoRoot $OutputIsoPath
  }
}

Write-Host "ISO staging ready at $isoRoot"
if ($resolvedApbx) {
  Write-Host "APBX package staged into $wizardRoot"
  Write-Host "Package carrier copied into $packageCarrierRoot"
}
else {
  Write-Host "Wizard bundle injected into $wizardRoot"
}
