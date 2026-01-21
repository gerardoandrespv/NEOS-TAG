[CmdletBinding()]
param(
  [ValidateSet("open")]
  [string]$Mode = "open",

  [string]$Ip = "192.168.1.201",
  [int]$Port = 4370,
  [int]$TimeoutMs = 20000,
  [int]$Passwd = 0,

  [string]$SdkPath = "C:\ZKTeco\ZKAccess3.5\NewSDK",

  [int]$Door = 1,
  [ValidateRange(1,60)]
  [int]$Seconds = 5
)

$ErrorActionPreference = "Stop"

# Ejecutar en x86 (plcommpro.dll suele ser 32-bit)
if ([Environment]::Is64BitProcess -and $env:ZK_PULLSDK_X86_RELAUNCH -ne "1") {
  $env:ZK_PULLSDK_X86_RELAUNCH = "1"
  $ps86 = Join-Path $env:WINDIR "SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
  $args = @("-NoProfile","-ExecutionPolicy","Bypass","-File",$PSCommandPath) + $MyInvocation.UnboundArguments
  & $ps86 @args
  exit $LASTEXITCODE
}

$cs = @"
using System;
using System.Runtime.InteropServices;

public static class PL {
  [DllImport("plcommpro.dll", CharSet=CharSet.Ansi, CallingConvention=CallingConvention.StdCall)]
  public static extern int Connect(string parameters);

  [DllImport("plcommpro.dll", CallingConvention=CallingConvention.StdCall)]
  public static extern void Disconnect(int handle);

  // int ControlDevice(HANDLE handle, LONG OperationID, LONG Param1, LONG Param2, LONG Param3, LONG Param4, const char *Options)
  [DllImport("plcommpro.dll", CharSet=CharSet.Ansi, CallingConvention=CallingConvention.StdCall)]
  public static extern int ControlDevice(int handle, int operationId, int p1, int p2, int p3, int p4, string options);
}
"@

Add-Type -Language CSharp -TypeDefinition $cs -ErrorAction SilentlyContinue | Out-Null

if (!(Test-Path -LiteralPath $SdkPath)) { throw "SdkPath no existe: $SdkPath" }
if (!(Test-Path -LiteralPath (Join-Path $SdkPath "plcommpro.dll"))) { throw "No existe plcommpro.dll en: $SdkPath" }

$prev = Get-Location
$h = 0

try {
  $env:PATH = "$SdkPath;$env:PATH"
  Set-Location $SdkPath

  $connectParams = "protocol=TCP,ipaddress=$Ip,port=$Port,timeout=$TimeoutMs,passwd=$Passwd"
  $h = [PL]::Connect($connectParams)

  if ($h -le 0) {
    [pscustomobject]@{
      ok = $false
      mode = $Mode
      handle = $h
      connectParams = $connectParams
      error = "Connect() devolvió HANDLE<=0"
    } | ConvertTo-Json -Depth 10
    return
  }

  # Nota: Parametría típica: operationId=1, p1=doorIndex(0-based), p3=seconds
  $doorZero = [Math]::Max(0, $Door - 1)
  $ret = [PL]::ControlDevice($h, 1, $doorZero, 1, $Seconds, 0, "")

  [pscustomobject]@{
    ok = ($ret -ge 0)
    mode = "open"
    handle = $h
    ret = $ret
    door = $Door
    seconds = $Seconds
  } | ConvertTo-Json -Depth 10
}
catch {
  [pscustomobject]@{
    ok = $false
    mode = $Mode
    handle = $h
    error = $_.Exception.Message
    hresult = ("0x{0:X8}" -f $_.Exception.HResult)
  } | ConvertTo-Json -Depth 10
}
finally {
  try { if ($h -gt 0) { [PL]::Disconnect($h) } } catch {}
  try { Set-Location $prev } catch {}
}
