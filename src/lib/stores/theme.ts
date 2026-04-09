import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'troth.theme.preference';
const LEGACY_MODE_KEY = 'troth.theme.mode';

export type ResolvedTheme = 'light' | 'dark';
export type ThemeId =
	| 'troth-light'
	| 'gruvbox'
	| 'gruvbox-light'
	| 'catppuccin'
	| 'catppuccin-latte'
	| 'dracula';

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
	preview: {
		background: string;
		card: string;
		text: string;
		muted: string;
		accent: string;
		swatches: string[];
	};
};

export const themeOptions: ThemeOption[] = [
	{
		value: 'troth-light',
		label: 'Troth Light',
		description: "Troth's soft neutral light theme.",
		resolved: 'light',
		themeColor: '#f4f1ea',
		preview: {
			background: '#f4f1ea',
			card: '#fffcf7',
			text: '#26211f',
			muted: '#7b7267',
			accent: '#6f8f55',
			swatches: ['#f4f1ea', '#dfd8cc', '#6f8f55', '#458588']
		}
	},
	{
		value: 'gruvbox',
		label: 'Gruvbox',
		description: 'Warm Gruvbox dark with strong contrast.',
		resolved: 'dark',
		themeColor: '#282828',
		preview: {
			background: '#282828',
			card: '#32302f',
			text: '#ebdbb2',
			muted: '#bdae93',
			accent: '#d79921',
			swatches: ['#282828', '#3c3836', '#d79921', '#83a598']
		}
	},
	{
		value: 'gruvbox-light',
		label: 'Gruvbox Light',
		description: 'Gruvbox light with warm paper tones.',
		resolved: 'light',
		themeColor: '#fbf1c7',
		preview: {
			background: '#fbf1c7',
			card: '#fefbf0',
			text: '#3c3836',
			muted: '#7c6f64',
			accent: '#b57614',
			swatches: ['#fbf1c7', '#d5c4a1', '#b57614', '#076678']
		}
	},
	{
		value: 'catppuccin',
		label: 'Catppuccin',
		description: 'Muted mauve-forward dark theme.',
		resolved: 'dark',
		themeColor: '#1e1e2e',
		preview: {
			background: '#1e1e2e',
			card: '#313244',
			text: '#cdd6f4',
			muted: '#a6adc8',
			accent: '#cba6f7',
			swatches: ['#1e1e2e', '#313244', '#cba6f7', '#89b4fa']
		}
	},
	{
		value: 'catppuccin-latte',
		label: 'Catppuccin Latte',
		description: 'Creamy Catppuccin light with soft pastel accents.',
		resolved: 'light',
		themeColor: '#eff1f5',
		preview: {
			background: '#eff1f5',
			card: '#ffffff',
			text: '#4c4f69',
			muted: '#7c7f93',
			accent: '#8839ef',
			swatches: ['#eff1f5', '#ccd0da', '#8839ef', '#1e66f5']
		}
	},
	{
		value: 'dracula',
		label: 'Dracula',
		description: 'Classic Dracula dark with vivid neon accents.',
		resolved: 'dark',
		themeColor: '#282a36',
		preview: {
			background: '#282a36',
			card: '#313443',
			text: '#f8f8f2',
			muted: '#b2b6d3',
			accent: '#bd93f9',
			swatches: ['#282a36', '#44475a', '#bd93f9', '#8be9fd']
		}
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
		value === 'catppuccin' ||
		value === 'catppuccin-latte' ||
		value === 'dracula'
	);
}
