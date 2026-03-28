import { readFileSync } from 'node:fs';
import { env } from '$env/dynamic/private';

export type BuildInfo = {
	version: string;
	baseVersion: string;
	buildTime: string;
	ref: string | null;
	label: string;
};

type PackageJson = {
	version?: string;
};

let cachedPackageVersion: string | null = null;
const fallbackBuildDate = new Date();

export function getBuildInfo(): BuildInfo {
	const baseVersion = readPackageVersion();
	const buildDate = readBuildDate();
	const version = formatBuildVersion(baseVersion, buildDate);
	const ref = normalizeBuildField(env.TROTH_BUILD_REF);
	const label = ref ? `${version} (${ref})` : version;

	return {
		version,
		baseVersion,
		buildTime: formatBuildTimeLabel(buildDate),
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

function readBuildDate() {
	const envValue = normalizeBuildField(env.TROTH_BUILD_TIME);

	if (!envValue) {
		return fallbackBuildDate;
	}

	const parsed = new Date(envValue);
	return Number.isNaN(parsed.getTime()) ? fallbackBuildDate : parsed;
}

function formatBuildVersion(baseVersion: string, buildDate: Date) {
	const [major = '0', minor = '0'] = baseVersion.split('.');

	return `${major}.${minor}.${formatBuildTimeSegment(buildDate)}`;
}

function formatBuildTimeSegment(buildDate: Date) {
	const year = String(buildDate.getUTCFullYear());
	const month = String(buildDate.getUTCMonth() + 1).padStart(2, '0');
	const day = String(buildDate.getUTCDate()).padStart(2, '0');
	const hours = String(buildDate.getUTCHours()).padStart(2, '0');
	const minutes = String(buildDate.getUTCMinutes()).padStart(2, '0');

	return `${year}${month}${day}${hours}${minutes}`;
}

function formatBuildTimeLabel(buildDate: Date) {
	return new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'UTC'
	}).format(buildDate);
}
