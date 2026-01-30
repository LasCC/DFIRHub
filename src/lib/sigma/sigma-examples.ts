export interface SigmaExample {
  title: string;
  description: string;
  yaml: string;
}

export const sigmaExamples: SigmaExample[] = [
  {
    title: "Suspicious PowerShell Encoded Command",
    description:
      "Detects encoded PowerShell execution commonly used by attackers",
    yaml: `title: Suspicious PowerShell Encoded Command
status: test
description: Detects execution of PowerShell with encoded commands
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\\powershell.exe'
        CommandLine|contains:
            - '-enc '
            - '-EncodedCommand '
            - '-e '
    condition: selection
level: high
tags:
    - attack.execution
    - attack.t1059.001`,
  },
  {
    title: "LSASS Memory Dump via Procdump",
    description: "Detects LSASS credential dumping using Sysinternals Procdump",
    yaml: `title: LSASS Memory Dump via Procdump
status: test
description: Detects usage of procdump to dump LSASS memory for credential theft
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains|all:
            - 'procdump'
            - 'lsass'
    condition: selection
level: critical
tags:
    - attack.credential_access
    - attack.t1003.001`,
  },
  {
    title: "Suspicious Scheduled Task Creation",
    description: "Detects creation of scheduled tasks via command line",
    yaml: `title: Suspicious Scheduled Task Creation
status: test
description: Detects creation of scheduled tasks which is a common persistence technique
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\\schtasks.exe'
        CommandLine|contains: '/create'
    condition: selection
level: medium
tags:
    - attack.persistence
    - attack.t1053.005`,
  },
  {
    title: "Registry Run Key Modification",
    description: "Detects modifications to registry Run keys for persistence",
    yaml: `title: Registry Run Key Modification
status: test
description: Detects modification of Run and RunOnce registry keys
logsource:
    category: registry_event
    product: windows
detection:
    selection:
        TargetObject|contains:
            - '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\\'
            - '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce\\'
    condition: selection
level: medium
tags:
    - attack.persistence
    - attack.t1547.001`,
  },
  {
    title: "Certutil Download Cradle",
    description: "Detects use of certutil to download files from the internet",
    yaml: `title: Certutil Download Cradle
status: test
description: Detects certutil.exe being used to download remote files
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\\certutil.exe'
        CommandLine|contains:
            - 'urlcache'
            - 'verifyctl'
    filter:
        CommandLine|contains: '/urlcache /split /f'
    condition: selection
level: high
tags:
    - attack.command_and_control
    - attack.t1105`,
  },
];
