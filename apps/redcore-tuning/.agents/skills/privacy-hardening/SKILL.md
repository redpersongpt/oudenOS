---
name: privacy-hardening
description: Disable Windows telemetry, data collection services, advertising ID, typing insights, activity feed, and cloud content for a lean, private gaming OS.
---

# Privacy Hardening Skill

## Overview
This skill applies all privacy-focused registry tweaks and service disablements. These changes also reduce background CPU/network usage, benefiting gaming performance.

---

## 1. Telemetry & Diagnostics

```powershell
# Disable DiagTrack service (Connected User Experiences and Telemetry)
Stop-Service DiagTrack -Force
Set-Service DiagTrack -StartupType Disabled

# Disable via registry
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" `
    -Name "AllowTelemetry" -Value 0 -Type DWord
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" `
    -Name "LimitDiagnosticLogCollection" -Value 1 -Type DWord
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" `
    -Name "DoNotShowFeedbackNotifications" -Value 1 -Type DWord
```

---

## 2. Disable Advertising ID

```powershell
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo" `
    -Name "DisabledByGroupPolicy" -Value 1 -Type DWord
```

---

## 3. Disable Activity Feed & Clipboard History

```powershell
$systemPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System"
Set-ItemProperty $systemPath -Name "EnableActivityFeed" -Value 0 -Type DWord
Set-ItemProperty $systemPath -Name "PublishUserActivities" -Value 0 -Type DWord
Set-ItemProperty $systemPath -Name "UploadUserActivities" -Value 0 -Type DWord
Set-ItemProperty $systemPath -Name "AllowClipboardHistory" -Value 0 -Type DWord
Set-ItemProperty $systemPath -Name "AllowCrossDeviceClipboard" -Value 0 -Type DWord
```

---

## 4. Disable Cloud Content & Consumer Features

```powershell
$cloudPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent"
Set-ItemProperty $cloudPath -Name "DisableCloudOptimizedContent" -Value 1 -Type DWord
Set-ItemProperty $cloudPath -Name "DisableConsumerAccountStateContent" -Value 1 -Type DWord
Set-ItemProperty $cloudPath -Name "DisableSoftLanding" -Value 1 -Type DWord
Set-ItemProperty $cloudPath -Name "DisableWindowsConsumerFeatures" -Value 1 -Type DWord
```

---

## 5. Disable Typing Insights & Inking Data Collection

```powershell
Set-ItemProperty "HKCU:\SOFTWARE\Microsoft\input\Settings" `
    -Name "InsightsEnabled" -Value 0 -Type DWord

Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\TextInput" `
    -Name "AllowLinguisticDataCollection" -Value 0 -Type DWord
```

---

## 6. Disable Customer Experience Improvement Program (CEIP)

```powershell
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\SQMClient\Windows" `
    -Name "CEIPEnable" -Value 0 -Type DWord
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\SQMClient\Windows" `
    -Name "CEIPEnable" -Value 0 -Type DWord
```

---

## 7. Disable Error Reporting

```powershell
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting" `
    -Name "Disabled" -Value 1 -Type DWord
Set-ItemProperty "HKCU:\Software\Microsoft\Windows\Windows Error Reporting" `
    -Name "DontSendAdditionalData" -Value 1 -Type DWord

# Disable WER service
Stop-Service WerSvc -Force
Set-Service WerSvc -StartupType Disabled
```

---

## 8. Disable Widgets (Windows 11)

```powershell
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Dsh" `
    -Name "AllowNewsAndInterests" -Value 0 -Type DWord
```

---

## 9. Disable Background Apps

```powershell
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" `
    -Name "LetAppsRunInBackground" -Value 2 -Type DWord
```

---

## Verification

```powershell
# Check telemetry setting
(Get-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection").AllowTelemetry

# Check DiagTrack service
Get-Service DiagTrack | Select Name, Status, StartType
```
