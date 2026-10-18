export interface AuditSubcategory {
  category: string;
  subcategory: string;
  guid: string;
  eventIds: number[];
}

export const WINDOWS_AUDIT_SUBCATEGORIES: AuditSubcategory[] = [
  {
    category: "Account Logon",
    eventIds: [4774, 4775, 4776, 4777],
    guid: "{0CCE923F-69AE-11D9-BED3-505054503030}",
    subcategory: "Credential Validation",
  },
  {
    category: "Account Logon",
    eventIds: [4768, 4771, 4772],
    guid: "{0CCE9242-69AE-11D9-BED3-505054503030}",
    subcategory: "Kerberos Authentication Service",
  },
  {
    category: "Account Logon",
    eventIds: [4769, 4770, 4773],
    guid: "{0CCE9240-69AE-11D9-BED3-505054503030}",
    subcategory: "Kerberos Service Ticket Operations",
  },
  {
    category: "Account Management",
    eventIds: [4783, 4784, 4785, 4786, 4787, 4788, 4789, 4790, 4791, 4792],
    guid: "{0CCE9239-69AE-11D9-BED3-505054503030}",
    subcategory: "Application Group Management",
  },
  {
    category: "Account Management",
    eventIds: [4741, 4742, 4743],
    guid: "{0CCE9236-69AE-11D9-BED3-505054503030}",
    subcategory: "Computer Account Management",
  },
  {
    category: "Account Management",
    eventIds: [4749, 4750, 4751, 4752, 4753],
    guid: "{0CCE9238-69AE-11D9-BED3-505054503030}",
    subcategory: "Distribution Group Management",
  },
  {
    category: "Account Management",
    eventIds: [4782, 4793],
    guid: "{0CCE923A-69AE-11D9-BED3-505054503030}",
    subcategory: "Other Account Management Events",
  },
  {
    category: "Account Management",
    eventIds: [
      4727, 4728, 4729, 4730, 4731, 4732, 4733, 4734, 4735, 4737, 4754, 4755,
      4756, 4757, 4758, 4764, 4799,
    ],
    guid: "{0CCE9237-69AE-11D9-BED3-505054503030}",
    subcategory: "Security Group Management",
  },
  {
    category: "Account Management",
    eventIds: [
      4720, 4722, 4723, 4724, 4725, 4726, 4738, 4740, 4765, 4766, 4767, 4780,
      4781, 4794, 4798, 5376, 5377,
    ],
    guid: "{0CCE9235-69AE-11D9-BED3-505054503030}",
    subcategory: "User Account Management",
  },
  {
    category: "Detailed Tracking",
    eventIds: [4692, 4693, 4694, 4695],
    guid: "{0CCE922D-69AE-11D9-BED3-505054503030}",
    subcategory: "DPAPI Activity",
  },
  {
    category: "Detailed Tracking",
    eventIds: [6416, 6419, 6420, 6421, 6422, 6423, 6424],
    guid: "{0CCE9248-69AE-11D9-BED3-505054503030}",
    subcategory: "PNP Activity",
  },
  {
    category: "Detailed Tracking",
    eventIds: [4688, 4696],
    guid: "{0CCE922B-69AE-11D9-BED3-505054503030}",
    subcategory: "Process Creation",
  },
  {
    category: "Detailed Tracking",
    eventIds: [4689],
    guid: "{0CCE922C-69AE-11D9-BED3-505054503030}",
    subcategory: "Process Termination",
  },
  {
    category: "Detailed Tracking",
    eventIds: [5712],
    guid: "{0CCE922E-69AE-11D9-BED3-505054503030}",
    subcategory: "RPC Events",
  },
  {
    category: "Detailed Tracking",
    eventIds: [4703],
    guid: "{0CCE924A-69AE-11D9-BED3-505054503030}",
    subcategory: "Token Right Adjusted",
  },
  {
    category: "DS Access",
    eventIds: [4928, 4929, 4930, 4931, 4934, 4935, 4936, 4937],
    guid: "{0CCE923E-69AE-11D9-BED3-505054503030}",
    subcategory: "Detailed Directory Service Replication",
  },
  {
    category: "DS Access",
    eventIds: [4661, 4662],
    guid: "{0CCE923B-69AE-11D9-BED3-505054503030}",
    subcategory: "Directory Service Access",
  },
  {
    category: "DS Access",
    eventIds: [5136, 5137, 5138, 5139, 5141],
    guid: "{0CCE923C-69AE-11D9-BED3-505054503030}",
    subcategory: "Directory Service Changes",
  },
  {
    category: "DS Access",
    eventIds: [4932, 4933],
    guid: "{0CCE923D-69AE-11D9-BED3-505054503030}",
    subcategory: "Directory Service Replication",
  },
  {
    category: "Logon/Logoff",
    eventIds: [4625],
    guid: "{0CCE9217-69AE-11D9-BED3-505054503030}",
    subcategory: "Account Lockout",
  },
  {
    category: "Logon/Logoff",
    eventIds: [4626],
    guid: "{0CCE9247-69AE-11D9-BED3-505054503030}",
    subcategory: "User/Device Claims",
  },
  {
    category: "Logon/Logoff",
    eventIds: [4627],
    guid: "{0CCE9249-69AE-11D9-BED3-505054503030}",
    subcategory: "Group Membership",
  },
  {
    category: "Logon/Logoff",
    eventIds: [4978, 4979, 4980, 4981, 4982, 4983, 4984],
    guid: "{0CCE921A-69AE-11D9-BED3-505054503030}",
    subcategory: "IPsec Extended Mode",
  },
  {
    category: "Logon/Logoff",
    eventIds: [4646, 4650, 4651, 4652, 4653, 4655, 4976, 5049, 5453],
    guid: "{0CCE9218-69AE-11D9-BED3-505054503030}",
    subcategory: "IPsec Main Mode",
  },
  {
    category: "Logon/Logoff",
    eventIds: [4977, 5451, 5452],
    guid: "{0CCE9219-69AE-11D9-BED3-505054503030}",
    subcategory: "IPsec Quick Mode",
  },
  {
    category: "Logon/Logoff",
    eventIds: [4634, 4647],
    guid: "{0CCE9216-69AE-11D9-BED3-505054503030}",
    subcategory: "Logoff",
  },
  {
    category: "Logon/Logoff",
    eventIds: [4624, 4625, 4648, 4675],
    guid: "{0CCE9215-69AE-11D9-BED3-505054503030}",
    subcategory: "Logon",
  },
  {
    category: "Logon/Logoff",
    eventIds: [6272, 6273, 6274, 6275, 6276, 6277, 6278, 6279, 6280],
    guid: "{0CCE9243-69AE-11D9-BED3-505054503030}",
    subcategory: "Network Policy Server",
  },
  {
    category: "Logon/Logoff",
    eventIds: [4649, 4778, 4779, 4800, 4801, 4802, 4803, 5378, 5632, 5633],
    guid: "{0CCE921C-69AE-11D9-BED3-505054503030}",
    subcategory: "Other Logon/Logoff Events",
  },
  {
    category: "Logon/Logoff",
    eventIds: [4672, 4964],
    guid: "{0CCE921B-69AE-11D9-BED3-505054503030}",
    subcategory: "Special Logon",
  },
  {
    category: "Object Access",
    eventIds: [4665, 4666, 4667, 4668],
    guid: "{0CCE9222-69AE-11D9-BED3-505054503030}",
    subcategory: "Application Generated",
  },
  {
    category: "Object Access",
    eventIds: [
      4868, 4869, 4870, 4871, 4872, 4873, 4874, 4875, 4876, 4877, 4878, 4879,
      4880, 4881, 4882, 4883, 4884, 4885, 4886, 4887, 4888, 4889, 4890, 4891,
      4892, 4893, 4894, 4895, 4896, 4897, 4898,
    ],
    guid: "{0CCE9221-69AE-11D9-BED3-505054503030}",
    subcategory: "Certification Services",
  },
  {
    category: "Object Access",
    eventIds: [5145],
    guid: "{0CCE9244-69AE-11D9-BED3-505054503030}",
    subcategory: "Detailed File Share",
  },
  {
    category: "Object Access",
    eventIds: [5140, 5142, 5143, 5144, 5168],
    guid: "{0CCE9224-69AE-11D9-BED3-505054503030}",
    subcategory: "File Share",
  },
  {
    category: "Object Access",
    eventIds: [4656, 4658, 4660, 4663, 4664, 4670, 4985, 5051],
    guid: "{0CCE921D-69AE-11D9-BED3-505054503030}",
    subcategory: "File System",
  },
  {
    category: "Object Access",
    eventIds: [5031, 5150, 5151, 5154, 5155, 5156, 5157, 5158, 5159],
    guid: "{0CCE9226-69AE-11D9-BED3-505054503030}",
    subcategory: "Filtering Platform Connection",
  },
  {
    category: "Object Access",
    eventIds: [5152, 5153],
    guid: "{0CCE9225-69AE-11D9-BED3-505054503030}",
    subcategory: "Filtering Platform Packet Drop",
  },
  {
    category: "Object Access",
    eventIds: [4658, 4690],
    guid: "{0CCE9223-69AE-11D9-BED3-505054503030}",
    subcategory: "Handle Manipulation",
  },
  {
    category: "Object Access",
    eventIds: [4656, 4658, 4660, 4663],
    guid: "{0CCE921F-69AE-11D9-BED3-505054503030}",
    subcategory: "Kernel Object",
  },
  {
    category: "Object Access",
    eventIds: [
      4671, 4691, 4698, 4699, 4700, 4701, 4702, 5148, 5149, 5888, 5889, 5890,
    ],
    guid: "{0CCE9227-69AE-11D9-BED3-505054503030}",
    subcategory: "Other Object Access Events",
  },
  {
    category: "Object Access",
    eventIds: [4656, 4657, 4658, 4660, 4663, 4670, 5039],
    guid: "{0CCE921E-69AE-11D9-BED3-505054503030}",
    subcategory: "Registry",
  },
  {
    category: "Object Access",
    eventIds: [4656, 4658, 4663],
    guid: "{0CCE9245-69AE-11D9-BED3-505054503030}",
    subcategory: "Removable Storage",
  },
  {
    category: "Object Access",
    eventIds: [4661],
    guid: "{0CCE9220-69AE-11D9-BED3-505054503030}",
    subcategory: "SAM",
  },
  {
    category: "Object Access",
    eventIds: [4818],
    guid: "{0CCE9246-69AE-11D9-BED3-505054503030}",
    subcategory: "Central Access Policy Staging",
  },
  {
    category: "Policy Change",
    eventIds: [4715, 4719, 4817, 4902, 4904, 4905, 4906, 4907, 4908, 4912],
    guid: "{0CCE922F-69AE-11D9-BED3-505054503030}",
    subcategory: "Audit Policy Change",
  },
  {
    category: "Policy Change",
    eventIds: [
      4670, 4706, 4707, 4713, 4716, 4717, 4718, 4739, 4864, 4865, 4866, 4867,
    ],
    guid: "{0CCE9230-69AE-11D9-BED3-505054503030}",
    subcategory: "Authentication Policy Change",
  },
  {
    category: "Policy Change",
    eventIds: [4670, 4703, 4704, 4705, 4911, 4913],
    guid: "{0CCE9231-69AE-11D9-BED3-505054503030}",
    subcategory: "Authorization Policy Change",
  },
  {
    category: "Policy Change",
    eventIds: [
      4709, 4710, 4711, 4712, 5040, 5041, 5042, 5043, 5044, 5045, 5046, 5047,
      5048, 5440, 5441, 5442, 5443, 5444, 5446, 5448, 5449, 5450, 5456, 5457,
      5458, 5459, 5460, 5461, 5462, 5463, 5464, 5465, 5466, 5467, 5468, 5471,
      5472, 5473, 5474, 5477,
    ],
    guid: "{0CCE9233-69AE-11D9-BED3-505054503030}",
    subcategory: "Filtering Platform Policy Change",
  },
  {
    category: "Policy Change",
    eventIds: [
      4944, 4945, 4946, 4947, 4948, 4949, 4950, 4951, 4952, 4953, 4954, 4956,
      4957, 4958,
    ],
    guid: "{0CCE9232-69AE-11D9-BED3-505054503030}",
    subcategory: "MPSSVC Rule-Level Policy Change",
  },
  {
    category: "Policy Change",
    eventIds: [
      4714, 4819, 4826, 4909, 4910, 5063, 5064, 5065, 5066, 5067, 5068, 5069,
      5070, 5447, 6144, 6145,
    ],
    guid: "{0CCE9234-69AE-11D9-BED3-505054503030}",
    subcategory: "Other Policy Change Events",
  },
  {
    category: "Privilege Use",
    eventIds: [4673, 4674, 4985],
    guid: "{0CCE9229-69AE-11D9-BED3-505054503030}",
    subcategory: "Non Sensitive Privilege Use",
  },
  {
    category: "Privilege Use",
    eventIds: [4985],
    guid: "{0CCE922A-69AE-11D9-BED3-505054503030}",
    subcategory: "Other Privilege Use Events",
  },
  {
    category: "Privilege Use",
    eventIds: [4673, 4674, 4985],
    guid: "{0CCE9228-69AE-11D9-BED3-505054503030}",
    subcategory: "Sensitive Privilege Use",
  },
  {
    category: "System",
    eventIds: [
      4960, 4961, 4962, 4963, 4965, 5478, 5479, 5480, 5483, 5484, 5485,
    ],
    guid: "{0CCE9213-69AE-11D9-BED3-505054503030}",
    subcategory: "IPsec Driver",
  },
  {
    category: "System",
    eventIds: [
      5024, 5025, 5027, 5028, 5029, 5030, 5032, 5033, 5034, 5035, 5037, 5058,
      5059, 6400, 6401, 6402, 6403, 6404, 6405, 6406, 6407, 6408, 6409,
    ],
    guid: "{0CCE9214-69AE-11D9-BED3-505054503030}",
    subcategory: "Other System Events",
  },
  {
    category: "System",
    eventIds: [4608, 4616, 4621],
    guid: "{0CCE9210-69AE-11D9-BED3-505054503030}",
    subcategory: "Security State Change",
  },
  {
    category: "System",
    eventIds: [4610, 4611, 4614, 4622, 4697],
    guid: "{0CCE9211-69AE-11D9-BED3-505054503030}",
    subcategory: "Security System Extension",
  },
  {
    category: "System",
    eventIds: [
      4612, 4615, 4618, 4816, 5038, 5056, 5057, 5060, 5061, 5062, 6281, 6410,
    ],
    guid: "{0CCE9212-69AE-11D9-BED3-505054503030}",
    subcategory: "System Integrity",
  },
];

export function findAuditSubcategories(eventId: number): AuditSubcategory[] {
  return WINDOWS_AUDIT_SUBCATEGORIES.filter((entry) =>
    entry.eventIds.includes(eventId)
  );
}
