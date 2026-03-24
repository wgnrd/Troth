import { get, writable } from 'svelte/store';
import { VikunjaClient } from '$lib/api/vikunja';
import type { AppTask, CreateTaskInput, UpdateTaskInput } from '$lib/api/vikunja';
import { connection } from './connection';

export type TasksState = {
	items: AppTask[];
	loading: boolean;
	loaded: boolean;
	error: string | null;
	mutationError: string | null;
	creating: boolean;
	mutatingIds: number[];
};

function createTasksStore() {
	const initialState: TasksState = {
		items: [],
		loading: false,
		loaded: false,
		error: null,
		mutationError: null,
		creating: false,
		mutatingIds: []
	};

	const { subscribe, set, update } = writable<TasksState>(initialState);
	let lastConnectionKey = '';
	let temporaryId = -1;

	connection.subscribe(($connection) => {
		const nextKey = $connection.settings
			? `${$connection.settings.baseUrl}|${$connection.settings.token}`
			: '';

		if (nextKey !== lastConnectionKey) {
			lastConnectionKey = nextKey;
			set(initialState);
		}
	});

	async function load(force = false) {
		const current = get(connection);

		if (!current.settings) {
			set({
				...initialState,
				error: 'Add your Vikunja connection in Settings to load tasks.'
			});
			return;
		}

		const state = get({ subscribe });
		if (state.loading || (state.loaded && !force)) {
			return;
		}

		update((value) => ({ ...value, loading: true, error: null }));

		try {
			const client = new VikunjaClient(current.settings);
			const items = await client.fetchTasks();

			set({
				items,
				loading: false,
				loaded: true,
				error: null,
				mutationError: null,
				creating: false,
				mutatingIds: []
			});
		} catch (error) {
			update((value) => ({
				...value,
				loading: false,
				loaded: value.loaded,
				error: error instanceof Error ? error.message : 'Could not load tasks.'
			}));
		}
	}

	async function createTask(input: CreateTaskInput) {
		const current = get(connection);

		if (!current.settings) {
			update((state) => ({
				...state,
				mutationError: 'Add your Vikunja connection in Settings before creating tasks.'
			}));
			return null;
		}

		const optimisticTask: AppTask = {
			id: temporaryId--,
			title: input.title.trim(),
			description: '',
			completed: false,
			completedAt: null,
			dueDate: input.dueDate ?? null,
			priority: input.priority ?? 0,
			listId: input.listId,
			identifier: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		update((state) => ({
			...state,
			creating: true,
			mutationError: null,
			items: [optimisticTask, ...state.items]
		}));

		try {
			const client = new VikunjaClient(current.settings);
			const createdTask = await client.createTask(input);

			update((state) => ({
				...state,
				creating: false,
				items: state.items.map((task) => (task.id === optimisticTask.id ? createdTask : task))
			}));

			return createdTask;
		} catch (error) {
			update((state) => ({
				...state,
				creating: false,
				mutationError: error instanceof Error ? error.message : 'Could not create the task.',
				items: state.items.filter((task) => task.id !== optimisticTask.id)
			}));
			return null;
		}
	}

	async function updateTask(input: UpdateTaskInput) {
		return mutateTask(
			input.id,
			async (client) => client.updateTask(input),
			(task) => ({
				...task,
				title: input.title,
				description: input.description,
				dueDate: input.dueDate,
				priority: input.priority,
				listId: input.listId,
				completed: input.completed ?? task.completed,
				completedAt:
					input.completed === undefined
						? task.completedAt
						: input.completed
							? new Date().toISOString()
							: null
			})
		);
	}

	async function setCompleted(id: number, completed: boolean) {
		const currentTask = get({ subscribe }).items.find((task) => task.id === id);

		if (!currentTask || currentTask.listId === null) {
			return null;
		}

		const payload: UpdateTaskInput = {
			id: currentTask.id,
			title: currentTask.title,
			description: currentTask.description,
			dueDate: currentTask.dueDate,
			priority: currentTask.priority,
			listId: currentTask.listId,
			completed
		};

		return mutateTask(
			id,
			async (client) => client.setTaskCompleted(payload, completed),
			(task) => ({
				...task,
				completed,
				completedAt: completed ? new Date().toISOString() : null
			})
		);
	}

	async function deleteTask(id: number) {
		const current = get(connection);

		if (!current.settings) {
			update((state) => ({
				...state,
				mutationError: 'Add your Vikunja connection in Settings before deleting tasks.'
			}));
			return false;
		}

		const snapshot = get({ subscribe }).items;
		const existingTask = snapshot.find((task) => task.id === id);

		if (!existingTask) {
			return false;
		}

		update((state) => ({
			...state,
			mutationError: null,
			mutatingIds: [...state.mutatingIds, id],
			items: state.items.filter((task) => task.id !== id)
		}));

		try {
			const client = new VikunjaClient(current.settings);
			await client.deleteTask(id);

			update((state) => ({
				...state,
				mutatingIds: state.mutatingIds.filter((value) => value !== id)
			}));

			return true;
		} catch (error) {
			update((state) => ({
				...state,
				items: snapshot,
				mutatingIds: state.mutatingIds.filter((value) => value !== id),
				mutationError: error instanceof Error ? error.message : 'Could not delete the task.'
			}));
			return false;
		}
	}

	function clearMutationError() {
		update((state) => ({ ...state, mutationError: null }));
	}

	async function mutateTask(
		id: number,
		request: (client: VikunjaClient) => Promise<AppTask>,
		optimisticUpdate: (task: AppTask) => AppTask
	) {
		const current = get(connection);

		if (!current.settings) {
			update((state) => ({
				...state,
				mutationError: 'Add your Vikunja connection in Settings before saving tasks.'
			}));
			return null;
		}

		const snapshot = get({ subscribe }).items;

		update((state) => ({
			...state,
			mutationError: null,
			mutatingIds: [...state.mutatingIds, id],
			items: state.items.map((task) => (task.id === id ? optimisticUpdate(task) : task))
		}));

		try {
			const client = new VikunjaClient(current.settings);
			const savedTask = await request(client);

			update((state) => ({
				...state,
				mutatingIds: state.mutatingIds.filter((value) => value !== id),
				items: state.items.map((task) => (task.id === id ? savedTask : task))
			}));

			return savedTask;
		} catch (error) {
			update((state) => ({
				...state,
				items: snapshot,
				mutatingIds: state.mutatingIds.filter((value) => value !== id),
				mutationError: error instanceof Error ? error.message : 'Could not save the task.'
			}));
			return null;
		}
	}

	return {
		subscribe,
		load,
		refresh: () => load(true),
		createTask,
		updateTask,
		setCompleted,
		deleteTask,
		clearMutationError
	};
}

export const tasks = createTasksStore();
