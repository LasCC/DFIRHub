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
id: 1ada60c6-624a-58ef-b22f-8cc61779b3ba
status: experimental
description: Detects execution of PowerShell with encoded commands
author: DFIRHub
date: 2026-10-18
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
id: 50551224-6048-5d5a-98e2-eac99364191d
status: experimental
description: Detects usage of procdump to dump LSASS memory for credential theft
author: DFIRHub
date: 2026-10-18
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
id: a7d5a9d4-afeb-5b85-88e1-bca2cc982360
status: experimental
description: Detects creation of scheduled tasks which is a common persistence technique
author: DFIRHub
date: 2026-10-18
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
id: ced3edb1-9310-5955-93c0-2ea0890ea313
status: experimental
description: Detects modification of Run and RunOnce registry keys
author: DFIRHub
date: 2026-10-18
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
id: f209b093-8552-5636-82f0-63bf5485a511
status: experimental
description: Detects certutil.exe being used to download remote files
author: DFIRHub
date: 2026-10-18
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\\certutil.exe'
        CommandLine|contains:
            - 'urlcache'
            - 'verifyctl'
    condition: selection
level: high
tags:
    - attack.command_and_control
    - attack.t1105`,
  },
];
