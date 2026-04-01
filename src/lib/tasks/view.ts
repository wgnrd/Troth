import type { AppList, AppTask } from '$lib/api/vikunja';
import { filterTopLevelTasks } from '$lib/stores/tasks';

export type TaskViewKey = 'today' | 'inbox' | 'upcoming' | 'active' | 'completed';
export type RepeatUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
export const UPCOMING_DAY_WINDOW = 7;

const repeatUnitSeconds: Record<RepeatUnit, number> = {
	minute: 60,
	hour: 3_600,
	day: 86_400,
	week: 604_800,
	month: 2_592_000,
	year: 31_536_000
};

const dueDateFormatter = new Intl.DateTimeFormat('en-US', {
	day: '2-digit',
	month: 'short'
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
	weekday: 'long'
});

export function filterTasksForView(view: TaskViewKey, tasks: AppTask[], lists: AppList[]) {
	const visibleLists = new Set(getVisibleLists(lists).map((list) => list.id));
	const inboxList = findInboxList(lists);

	return filterTopLevelTasks(tasks).filter(
		(task) =>
			belongsToVisibleList(task, visibleLists) && matchesTaskView(task, view, inboxList?.id ?? null)
	);
}

export function findInboxList(lists: AppList[]) {
	return lists.find((list) => list.title.trim().toLowerCase() === 'inbox') ?? null;
}

export function sortTasks(tasks: AppTask[]) {
	return [...tasks].sort((left, right) => {
		const leftDueDate = normalizeDueDate(left.dueDate);
		const rightDueDate = normalizeDueDate(right.dueDate);

		if (left.completed !== right.completed) {
			return left.completed ? 1 : -1;
		}

		if (leftDueDate && rightDueDate) {
			return leftDueDate.localeCompare(rightDueDate);
		}

		if (leftDueDate) {
			return -1;
		}

		if (rightDueDate) {
			return 1;
		}

		return right.id - left.id;
	});
}

export function sortTodayTasks(tasks: AppTask[]) {
	return [...tasks].sort((left, right) => {
		if (left.completed !== right.completed) {
			return left.completed ? 1 : -1;
		}

		if (left.priority !== right.priority) {
			return right.priority - left.priority;
		}

		const createdAtOrder = compareCreatedAt(left.createdAt, right.createdAt);

		if (createdAtOrder !== 0) {
			return createdAtOrder;
		}

		return right.id - left.id;
	});
}

export function groupTasksByDate(tasks: AppTask[]) {
	const groups = new Map<string, AppTask[]>();

	for (const task of tasks) {
		const key = getDateBucketKey(task.dueDate) ?? 'no-date';
		const bucket = groups.get(key);

		if (bucket) {
			bucket.push(task);
			continue;
		}

		groups.set(key, [task]);
	}

	return Array.from(groups.entries()).map(([key, items]) => ({
		key,
		title: formatTaskGroupHeading(key === 'no-date' ? null : key),
		tasks: items
	}));
}

export function formatTaskDate(isoDate: string | null) {
	const normalized = normalizeDueDate(isoDate);

	if (!normalized) {
		return 'No due date';
	}

	const date = new Date(normalized);

	if (Number.isNaN(date.getTime())) {
		return 'No due date';
	}

	const now = new Date();
	const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffInDays = Math.round((taskDate.getTime() - todayDate.getTime()) / 86_400_000);

	if (diffInDays === 0) {
		return 'today';
	}

	if (diffInDays === 1) {
		return 'tomorrow';
	}

	if (diffInDays > 1 && diffInDays <= 5) {
		return weekdayFormatter.format(date).toLowerCase();
	}

	return formatCalendarDate(date);
}

export function getDueDateTone(isoDate: string | null) {
	const normalized = normalizeDueDate(isoDate);

	if (!normalized) {
		return 'text-muted-foreground';
	}

	const date = new Date(normalized);

	if (Number.isNaN(date.getTime())) {
		return 'text-muted-foreground';
	}

	const now = new Date();
	const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffInDays = Math.round((taskDate.getTime() - todayDate.getTime()) / 86_400_000);

	if (diffInDays === 0) {
		return 'text-amber-700';
	}

	if (diffInDays === 1) {
		return 'text-orange-700';
	}

	if (diffInDays > 1 && diffInDays <= 5) {
		return getWeekdayTone(date.getDay());
	}

	return 'text-muted-foreground';
}

export function getDueDateBadgeTone(isoDate: string | null) {
	const normalized = normalizeDueDate(isoDate);

	if (!normalized) {
		return 'bg-stone-100 text-muted-foreground hover:bg-stone-200';
	}

	const date = new Date(normalized);

	if (Number.isNaN(date.getTime())) {
		return 'bg-stone-100 text-muted-foreground hover:bg-stone-200';
	}

	const now = new Date();
	const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffInDays = Math.round((taskDate.getTime() - todayDate.getTime()) / 86_400_000);

	if (diffInDays === 0) {
		return 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/55 dark:text-amber-200 dark:hover:bg-amber-900/65';
	}

	if (diffInDays === 1) {
		return 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950/55 dark:text-orange-200 dark:hover:bg-orange-900/65';
	}

	if (diffInDays > 1 && diffInDays <= 5) {
		return getWeekdayBadgeTone(date.getDay());
	}

	return 'bg-stone-100 text-muted-foreground hover:bg-stone-200 dark:bg-white/8 dark:text-muted-foreground dark:hover:bg-white/12';
}

export function getDueDateFieldTone(isoDate: string | null) {
	const normalized = normalizeDueDate(isoDate);

	if (!normalized) {
		return 'border-border/70 bg-background';
	}

	const date = new Date(normalized);

	if (Number.isNaN(date.getTime())) {
		return 'border-border/70 bg-background';
	}

	const now = new Date();
	const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffInDays = Math.round((taskDate.getTime() - todayDate.getTime()) / 86_400_000);

	if (diffInDays === 0) {
		return 'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/28';
	}

	if (diffInDays === 1) {
		return 'border-orange-200 bg-orange-50/70 dark:border-orange-900/70 dark:bg-orange-950/28';
	}

	if (diffInDays > 1 && diffInDays <= 5) {
		return getWeekdayFieldTone(date.getDay());
	}

	return 'border-border/70 bg-background';
}

export function toDateInputValue(isoDate: string | null) {
	const normalized = normalizeDueDate(isoDate);

	if (!normalized) {
		return '';
	}

	const date = new Date(normalized);

	if (Number.isNaN(date.getTime())) {
		return '';
	}

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export function fromDateInputValue(value: string) {
	if (!value) {
		return null;
	}

	return `${value}T12:00:00.000Z`;
}

export function getPriorityLabel(priority: number) {
	if (priority >= 5) {
		return 'High';
	}

	if (priority >= 3) {
		return 'Medium';
	}

	if (priority >= 1) {
		return 'Low';
	}

	return null;
}

export function getPriorityCheckboxTone(priority: number) {
	if (priority >= 5) {
		return {
			idle: 'bg-rose-100/85 text-rose-600 hover:bg-rose-150 hover:text-rose-700 dark:bg-rose-950/55 dark:text-rose-200 dark:hover:bg-rose-900/65 dark:hover:text-rose-100',
			completed: 'bg-rose-100 text-rose-700 dark:bg-rose-950/62 dark:text-rose-100'
		};
	}

	if (priority >= 3) {
		return {
			idle: 'bg-orange-100/85 text-orange-600 hover:bg-orange-150 hover:text-orange-700 dark:bg-orange-950/55 dark:text-orange-200 dark:hover:bg-orange-900/65 dark:hover:text-orange-100',
			completed: 'bg-orange-100 text-orange-700 dark:bg-orange-950/62 dark:text-orange-100'
		};
	}

	if (priority >= 1) {
		return {
			idle: 'bg-sky-100/85 text-sky-600 hover:bg-sky-150 hover:text-sky-700 dark:bg-sky-950/55 dark:text-sky-200 dark:hover:bg-sky-900/65 dark:hover:text-sky-100',
			completed: 'bg-sky-100 text-sky-700 dark:bg-sky-950/62 dark:text-sky-100'
		};
	}

	return {
		idle: 'bg-stone-100 text-muted-foreground hover:bg-stone-200 hover:text-foreground dark:bg-white/8 dark:text-stone-300 dark:hover:bg-white/12 dark:hover:text-stone-100',
		completed: 'bg-primary/14 text-primary dark:bg-primary/18 dark:text-primary'
	};
}

export function isTaskRepeating(task: Pick<AppTask, 'repeatAfter' | 'repeatMode'>) {
	const repeatMode = normalizeTaskRepeatMode(task.repeatMode);
	return Boolean((task.repeatAfter ?? 0) > 0 || repeatMode === 1 || repeatMode === 2);
}

export function formatTaskRepeat(task: Pick<AppTask, 'repeatAfter' | 'repeatMode'>) {
	if (!isTaskRepeating(task)) {
		return null;
	}

	const repeatMode = normalizeTaskRepeatMode(task.repeatMode);
	const repeatAfter = task.repeatAfter ?? 0;

	if (repeatMode === 1) {
		return 'Monthly';
	}

	if (repeatAfter <= 0) {
		return repeatMode === 2 ? 'Repeating from completion' : 'Repeating';
	}

	const everyLabel = formatRepeatInterval(repeatAfter);

	if (repeatMode === 2) {
		return `${everyLabel} from completion`;
	}

	return everyLabel;
}

export function normalizeTaskRepeatMode(mode: number | null | undefined) {
	return mode === 1 ? 1 : mode === 2 || mode === 3 ? 2 : 0;
}

export function composeRepeatInterval(amount: number, unit: RepeatUnit) {
	return Math.max(1, Math.floor(amount)) * repeatUnitSeconds[unit];
}

export function getRepeatIntervalParts(seconds: number | null | undefined): {
	amount: number;
	unit: RepeatUnit;
} {
	const normalized = Math.max(0, seconds ?? 0);
	const units: RepeatUnit[] = ['year', 'month', 'week', 'day', 'hour', 'minute'];

	for (const unit of units) {
		const unitSeconds = repeatUnitSeconds[unit];

		if (normalized >= unitSeconds && normalized % unitSeconds === 0) {
			return {
				amount: normalized / unitSeconds,
				unit
			};
		}
	}

	return {
		amount: 1,
		unit: 'day'
	};
}

export function formatTaskGroupHeading(isoDate: string | null) {
	const normalized = normalizeDueDate(isoDate);

	if (!normalized) {
		return 'No due date';
	}

	const date = parseGroupingDate(normalized);

	if (!date) {
		return 'No due date';
	}

	const today = new Date();
	const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const groupDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffInDays = Math.round((groupDate.getTime() - todayDate.getTime()) / 86_400_000);

	if (diffInDays === 0) {
		return `Today - ${formatHeaderDate(date)}`;
	}

	if (diffInDays === 1) {
		return `Tomorrow - ${formatHeaderDate(date)}`;
	}

	return `${weekdayFormatter.format(date)} - ${formatHeaderDate(date)}`;
}

function getVisibleLists(lists: AppList[]) {
	return lists.filter((list) => !list.isArchived);
}

function belongsToVisibleList(task: AppTask, visibleListIds: Set<number>) {
	return task.listId === null || visibleListIds.size === 0 || visibleListIds.has(task.listId);
}

function matchesTaskView(task: AppTask, view: TaskViewKey, inboxListId: number | null) {
	switch (view) {
		case 'today':
			return !task.completed && isDueTodayOrEarlier(task.dueDate);
		case 'inbox':
			return !task.completed && inboxListId !== null && task.listId === inboxListId;
		case 'upcoming':
			return !task.completed && isUpcoming(task.dueDate);
		case 'active':
			return !task.completed;
		case 'completed':
			return task.completed;
	}
}

function formatRepeatInterval(seconds: number) {
	const intervals: Array<{ unit: RepeatUnit; seconds: number }> = [
		{ unit: 'year', seconds: repeatUnitSeconds.year },
		{ unit: 'month', seconds: repeatUnitSeconds.month },
		{ unit: 'week', seconds: repeatUnitSeconds.week },
		{ unit: 'day', seconds: repeatUnitSeconds.day },
		{ unit: 'hour', seconds: repeatUnitSeconds.hour },
		{ unit: 'minute', seconds: repeatUnitSeconds.minute }
	];

	for (const interval of intervals) {
		if (seconds >= interval.seconds && seconds % interval.seconds === 0) {
			const amount = seconds / interval.seconds;
			return `Every ${amount} ${interval.unit}${amount === 1 ? '' : 's'}`;
		}
	}

	return `Every ${seconds} seconds`;
}

function isDueTodayOrEarlier(isoDate: string | null) {
	const diffInDays = getDateDiffInDays(isoDate);
	return diffInDays !== null && diffInDays <= 0;
}

function isUpcoming(isoDate: string | null) {
	const diffInDays = getDateDiffInDays(isoDate);
	return diffInDays !== null && diffInDays >= 0 && diffInDays < UPCOMING_DAY_WINDOW;
}

function compareCreatedAt(left: string | null, right: string | null) {
	if (left && right) {
		const leftTime = new Date(left).getTime();
		const rightTime = new Date(right).getTime();

		if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
			return leftTime - rightTime;
		}
	}

	if (left) {
		return -1;
	}

	if (right) {
		return 1;
	}

	return 0;
}

function getDateDiffInDays(isoDate: string | null) {
	const date = parseDueDate(isoDate);

	if (!date) {
		return null;
	}

	const now = new Date();
	const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	return Math.round((taskDate.getTime() - todayDate.getTime()) / 86_400_000);
}

function normalizeDueDate(isoDate: string | null) {
	if (!isoDate) {
		return null;
	}

	const trimmed = isoDate.trim();

	if (!trimmed || trimmed.startsWith('0001-01-01')) {
		return null;
	}

	return trimmed;
}

function parseDueDate(isoDate: string | null) {
	const normalized = normalizeDueDate(isoDate);

	if (!normalized) {
		return null;
	}

	const date = new Date(normalized);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date;
}

function getDateBucketKey(isoDate: string | null) {
	const date = parseDueDate(isoDate);

	if (!date) {
		return null;
	}

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

function parseGroupingDate(value: string) {
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		const [year, month, day] = value.split('-').map(Number);
		return new Date(year, month - 1, day);
	}

	return parseDueDate(value);
}

function formatCalendarDate(date: Date) {
	const formatted = dueDateFormatter.format(date);
	const [day, month] = formatted.replace(',', '').split(' ');

	return `${day}.${month}`;
}

function formatHeaderDate(date: Date) {
	return dueDateFormatter.format(date);
}

function getWeekdayTone(day: number) {
	switch (day) {
		case 1:
			return 'text-sky-700';
		case 2:
			return 'text-violet-700';
		case 3:
			return 'text-emerald-700';
		case 4:
			return 'text-cyan-700';
		case 5:
			return 'text-fuchsia-700';
		case 6:
			return 'text-rose-700';
		case 0:
			return 'text-teal-700';
		default:
			return 'text-muted-foreground';
	}
}

function getWeekdayBadgeTone(day: number) {
	switch (day) {
		case 1:
			return 'bg-sky-100 text-sky-700 hover:bg-sky-200';
		case 2:
			return 'bg-violet-100 text-violet-700 hover:bg-violet-200';
		case 3:
			return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200';
		case 4:
			return 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200';
		case 5:
			return 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200';
		case 6:
			return 'bg-rose-100 text-rose-700 hover:bg-rose-200';
		case 0:
			return 'bg-teal-100 text-teal-700 hover:bg-teal-200';
		default:
			return 'bg-stone-100 text-muted-foreground hover:bg-stone-200';
	}
}

function getWeekdayFieldTone(day: number) {
	switch (day) {
		case 1:
			return 'border-sky-200 bg-sky-50/70';
		case 2:
			return 'border-violet-200 bg-violet-50/70';
		case 3:
			return 'border-emerald-200 bg-emerald-50/70';
		case 4:
			return 'border-cyan-200 bg-cyan-50/70';
		case 5:
			return 'border-fuchsia-200 bg-fuchsia-50/70';
		case 6:
			return 'border-rose-200 bg-rose-50/70';
		case 0:
			return 'border-teal-200 bg-teal-50/70';
		default:
			return 'border-border/70 bg-background';
	}
}
