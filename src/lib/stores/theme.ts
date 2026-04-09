import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'troth.theme.preference';
const LEGACY_MODE_KEY = 'troth.theme.mode';

export type ResolvedTheme = 'light' | 'dark';
export type ThemeId = 'troth-light' | 'gruvbox' | 'gruvbox-light' | 'catppuccin';

export type ThemeState = {
	selected: ThemeId;
	resolved: ResolvedTheme;
};

export type ThemeOption = {
	value: ThemeId;
	label: string;
	description: string;
	resolved: ResolvedTheme;
	themeColor: string;
};

export const themeOptions: ThemeOption[] = [
	{
		value: 'troth-light',
		label: 'Troth Light',
		description: "Troth's soft neutral light theme.",
		resolved: 'light',
		themeColor: '#f4f1ea'
	},
	{
		value: 'gruvbox',
		label: 'Gruvbox',
		description: 'Warm Gruvbox dark with strong contrast.',
		resolved: 'dark',
		themeColor: '#282828'
	},
	{
		value: 'gruvbox-light',
		label: 'Gruvbox Light',
		description: 'Gruvbox light with warm paper tones.',
		resolved: 'light',
		themeColor: '#fbf1c7'
	},
	{
		value: 'catppuccin',
		label: 'Catppuccin',
		description: 'Muted mauve-forward dark theme.',
		resolved: 'dark',
		themeColor: '#1e1e2e'
	}
];

const DEFAULT_THEME = themeOptions[0];

function createThemeStore() {
	const initialTheme = browser ? readStoredTheme() : DEFAULT_THEME.value;
	const { subscribe, set } = writable<ThemeState>(createState(initialTheme));

	if (browser) {
		applyTheme(initialTheme);
	}

	function setTheme(selected: ThemeId) {
		const nextState = createState(selected);

		if (browser) {
			localStorage.setItem(STORAGE_KEY, selected);
			localStorage.removeItem(LEGACY_MODE_KEY);
			applyTheme(selected);
		}

		set(nextState);
	}

	return {
		subscribe,
		setTheme
	};
}

export const theme = createThemeStore();

function readStoredTheme(): ThemeId {
	const raw = localStorage.getItem(STORAGE_KEY);

	if (isThemeId(raw)) {
		return raw;
	}

	const legacyMode = localStorage.getItem(LEGACY_MODE_KEY);
	if (legacyMode === 'dark') {
		return 'gruvbox';
	}
	if (legacyMode === 'light' || legacyMode === 'system') {
		return 'troth-light';
	}

	return DEFAULT_THEME.value;
}

function createState(selected: ThemeId): ThemeState {
	const option = themeOptions.find((theme) => theme.value === selected) ?? DEFAULT_THEME;

	return {
		selected: option.value,
		resolved: option.resolved
	};
}

function applyTheme(selected: ThemeId) {
	if (!browser) {
		return;
	}

	const option = themeOptions.find((theme) => theme.value === selected) ?? DEFAULT_THEME;
	document.documentElement.dataset.theme = option.value;
	document.documentElement.classList.toggle('dark', option.resolved === 'dark');
	document.documentElement.style.colorScheme = option.resolved;

	const themeColor = document.querySelector('meta[name="theme-color"]');
	themeColor?.setAttribute('content', option.themeColor);

	const favicon = document.querySelector<HTMLLinkElement>('#app-favicon');
	favicon?.setAttribute(
		'href',
		option.resolved === 'dark' ? '/favicon-dark.svg?v=3' : '/favicon.svg?v=3'
	);
}

function isThemeId(value: unknown): value is ThemeId {
	return (
		value === 'troth-light' ||
		value === 'gruvbox' ||
		value === 'gruvbox-light' ||
		value === 'catppuccin'
	);
}
