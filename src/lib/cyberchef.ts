// CyberChef URL generator for DFIRHub
// Generates deep links to CyberChef with pre-configured recipes

const CYBERCHEF_BASE = "https://gchq.github.io/CyberChef";

export interface CyberChefRecipe {
	id: string;
	name: string;
	description: string;
	recipe: string; // JSON-encoded recipe
	patterns: RegExp[]; // Artifact name patterns this applies to
}

// Pre-defined recipes for common forensic decoding tasks
export const recipes: CyberChefRecipe[] = [
	{
		id: "rot13",
		name: "ROT13 Decode",
		description: "Decode ROT13 encoded strings (e.g., UserAssist)",
		recipe: JSON.stringify([{ op: "ROT13", args: [true, true, false, 13] }]),
		patterns: [/userassist/i],
	},
	{
		id: "base64",
		name: "Base64 Decode",
		description: "Decode Base64 encoded data",
		recipe: JSON.stringify([
			{ op: "From Base64", args: ["A-Za-z0-9+/=", true, false] },
		]),
		patterns: [/base64/i, /encoded/i, /powershell.*log/i],
	},
	{
		id: "hex",
		name: "Hex Decode",
		description: "Decode hexadecimal data",
		recipe: JSON.stringify([{ op: "From Hex", args: ["Auto"] }]),
		patterns: [/hex/i, /registry.*value/i],
	},
	{
		id: "url-decode",
		name: "URL Decode",
		description: "Decode URL-encoded strings",
		recipe: JSON.stringify([{ op: "URL Decode", args: [] }]),
		patterns: [/url/i, /browser.*history/i, /download/i],
	},
	{
		id: "unicode",
		name: "Unicode Decode",
		description: "Decode Unicode escape sequences",
		recipe: JSON.stringify([
			{ op: "Unescape Unicode Characters", args: ["\\u"] },
		]),
		patterns: [/unicode/i, /powershell/i],
	},
	{
		id: "timestamps",
		name: "Windows FILETIME",
		description: "Convert Windows FILETIME to readable date",
		recipe: JSON.stringify([
			{
				op: "Windows Filetime to UNIX Timestamp",
				args: ["Nanoseconds (ns)", "Seconds (s)"],
			},
			{ op: "From UNIX Timestamp", args: ["Seconds (s)"] },
		]),
		patterns: [/filetime/i, /timestamp/i, /mft/i, /ntfs/i, /prefetch/i],
	},
	{
		id: "guid",
		name: "Parse GUID",
		description: "Parse and format GUID bytes",
		recipe: JSON.stringify([
			{ op: "From Hex", args: ["Auto"] },
			{ op: "Change IP format", args: ["Raw", "Dotted Decimal"] },
		]),
		patterns: [/guid/i, /uuid/i],
	},
	{
		id: "registry-binary",
		name: "Registry Binary",
		description: "Decode binary registry values",
		recipe: JSON.stringify([
			{ op: "From Hex", args: ["Auto"] },
			{ op: "Decode text", args: ["UTF-16LE (1200)"] },
		]),
		patterns: [/registry/i, /ntuser/i, /usrclass/i, /sam\b/i],
	},
	{
		id: "sid",
		name: "Windows SID",
		description: "Parse Windows Security Identifier",
		recipe: JSON.stringify([{ op: "From Hex", args: ["Auto"] }]),
		patterns: [/sid/i, /security.*identifier/i, /sam\b/i],
	},
	{
		id: "xor-bruteforce",
		name: "XOR Brute Force",
		description: "Brute force single-byte XOR encryption",
		recipe: JSON.stringify([
			{
				op: "XOR Brute Force",
				args: [100, "Standard", false, "string", "", 0],
			},
		]),
		patterns: [/xor/i, /encrypted/i, /obfuscated/i],
	},
	{
		id: "gunzip",
		name: "Gunzip Decompress",
		description: "Decompress gzip compressed data",
		recipe: JSON.stringify([{ op: "Gunzip", args: [] }]),
		patterns: [/gzip/i, /\.gz/i, /compressed/i],
	},
	{
		id: "deflate",
		name: "Raw Inflate",
		description: "Decompress raw deflate data",
		recipe: JSON.stringify([
			{ op: "Raw Inflate", args: [0, 0, "Adaptive", false, false] },
		]),
		patterns: [/deflate/i, /compressed/i],
	},
];

// Get applicable recipes for an artifact
export function getRecipesForArtifact(artifactName: string): CyberChefRecipe[] {
	return recipes.filter((recipe) =>
		recipe.patterns.some((pattern) => pattern.test(artifactName)),
	);
}

// Generate CyberChef URL with recipe
export function generateCyberChefUrl(
	recipe: CyberChefRecipe,
	input?: string,
): string {
	const params = new URLSearchParams();
	params.set("recipe", recipe.recipe);

	if (input) {
		params.set("input", btoa(input));
	}

	return `${CYBERCHEF_BASE}/#${params.toString()}`;
}

// Generate CyberChef URL for a specific operation
export function generateCustomRecipeUrl(
	operations: Array<{ op: string; args: unknown[] }>,
	input?: string,
): string {
	const params = new URLSearchParams();
	params.set("recipe", JSON.stringify(operations));

	if (input) {
		params.set("input", btoa(input));
	}

	return `${CYBERCHEF_BASE}/#${params.toString()}`;
}

// Common one-off recipe generators
export const quickRecipes = {
	rot13: (input?: string) =>
		generateCustomRecipeUrl(
			[{ op: "ROT13", args: [true, true, false, 13] }],
			input,
		),

	base64Decode: (input?: string) =>
		generateCustomRecipeUrl(
			[{ op: "From Base64", args: ["A-Za-z0-9+/=", true, false] }],
			input,
		),

	hexDecode: (input?: string) =>
		generateCustomRecipeUrl([{ op: "From Hex", args: ["Auto"] }], input),

	urlDecode: (input?: string) =>
		generateCustomRecipeUrl([{ op: "URL Decode", args: [] }], input),

	windowsFiletime: (input?: string) =>
		generateCustomRecipeUrl(
			[
				{
					op: "Windows Filetime to UNIX Timestamp",
					args: ["Nanoseconds (ns)", "Seconds (s)"],
				},
				{ op: "From UNIX Timestamp", args: ["Seconds (s)"] },
			],
			input,
		),

	registryBinary: (input?: string) =>
		generateCustomRecipeUrl(
			[
				{ op: "From Hex", args: ["Auto"] },
				{ op: "Decode text", args: ["UTF-16LE (1200)"] },
			],
			input,
		),
};
