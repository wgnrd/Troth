import { readFileSync } from 'node:fs';
import { env } from '$env/dynamic/private';

export type BuildInfo = {
	version: string;
	ref: string | null;
	label: string;
};

type PackageJson = {
	version?: string;
};

let cachedPackageVersion: string | null = null;

export function getBuildInfo(): BuildInfo {
	const version = readPackageVersion();
	const ref = normalizeBuildField(env.TROTH_BUILD_REF);
	const label = ref ? `${version} (${ref})` : version;

	return {
		version,
		ref,
		label
	};
}

function readPackageVersion() {
	if (cachedPackageVersion) {
		return cachedPackageVersion;
	}

	try {
		const packageJsonPath = new URL('../../../package.json', import.meta.url);
		const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson;
		cachedPackageVersion = packageJson.version?.trim() || '0.0.0';
	} catch {
		cachedPackageVersion = '0.0.0';
	}

	return cachedPackageVersion;
}

function normalizeBuildField(value: string | undefined) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}
