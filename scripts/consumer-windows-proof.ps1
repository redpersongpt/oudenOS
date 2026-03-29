# redcore OS Consumer Windows Certification Harness
# One-command wrapper around the real post-apply verification harness.

param(
    [string]$Profile = "gaming_desktop",
    [ValidateSet("conservative", "balanced", "aggressive")]
    [string]$Preset = "balanced",
    [ValidateSet("tier1", "tier2", "tier3", "all")]
    [string]$Priority = "tier1",
    [string]$AnswersPath = "apps/os-desktop/test/fixtures/gaming-certification-answers.json",
    [string]$OutputRoot = "artifacts/os-certification",
    [string]$ServiceExe = "",
    [switch]$SkipInstall,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputDir = Join-Path $OutputRoot $timestamp

Write-Host "== redcore OS consumer certification =="
Write-Host "Repo:      $repoRoot"
Write-Host "Profile:   $Profile"
Write-Host "Preset:    $Preset"
Write-Host "Priority:  $Priority"
Write-Host "Answers:   $AnswersPath"
Write-Host "Artifacts: $outputDir"
Write-Host ""

if (-not $SkipInstall) {
    Write-Host "-- pnpm install"
    pnpm install --frozen-lockfile
}

Write-Host "-- questionnaire audit"
pnpm --dir apps/os-desktop audit:questionnaire

Write-Host "-- verification matrix"
pnpm --dir apps/os-desktop verify:matrix --outputDir $outputDir

Write-Host "-- consumer Windows certification"
$harnessArgs = @(
    "--profile", $Profile,
    "--preset", $Preset,
    "--priority", $Priority,
    "--answersPath", $AnswersPath,
    "--outputDir", $outputDir
)

if ($ServiceExe) {
    $harnessArgs += @("--serviceExe", $ServiceExe)
}
if ($DryRun) {
    $harnessArgs += "--dryRun"
}

pnpm --dir apps/os-desktop certify:windows @harnessArgs

Write-Host ""
Write-Host "Artifacts written to: $outputDir"
Write-Host "Read these first:"
Write-Host "  - $outputDir\\certification-summary.json"
Write-Host "  - $outputDir\\action-results.json"
Write-Host "  - $outputDir\\personalization-report.json"
Write-Host "  - $outputDir\\selected-question-deltas.json"
