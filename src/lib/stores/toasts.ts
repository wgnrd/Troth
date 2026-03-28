import { writable } from 'svelte/store';

export type ToastAction = {
	label: string;
	onClick: () => Promise<void> | void;
};

export type ToastItem = {
	id: number;
	title: string;
	description?: string;
	duration?: number;
	action?: ToastAction;
};

function createToastStore() {
	const { subscribe, update } = writable<ToastItem[]>([]);
	let nextId = 1;

	function push(input: {
		title: string;
		description?: string;
		duration?: number;
		actionLabel?: string;
		onAction?: () => Promise<void> | void;
	}) {
		const toast: ToastItem = {
			id: nextId++,
			title: input.title,
			description: input.description,
			duration: input.duration ?? 5000,
			action:
				input.actionLabel && input.onAction
					? {
							label: input.actionLabel,
							onClick: input.onAction
						}
					: undefined
		};

		update((items) => [...items, toast]);
		return toast.id;
	}

	function dismiss(id: number) {
		update((items) => items.filter((item) => item.id !== id));
	}

	function clear() {
		update(() => []);
	}

	return {
		subscribe,
		push,
		dismiss,
		clear
	};
}

export const toast = createToastStore();
