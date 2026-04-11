import {
	CalendarRange,
	CheckCheck,
	Folders,
	Inbox,
	ListTodo,
	Settings2,
	Sun
} from '@lucide/svelte';
import type { AppRouteMeta } from '$lib/types/navigation';

export const appRoutes: AppRouteMeta[] = [
	{
		href: '/today',
		label: 'Today',
		emptyState: 'Nothing due today.',
		icon: Sun
	},
	{
		href: '/inbox',
		label: 'Inbox',
		emptyState: 'Inbox is clear.',
		icon: Inbox
	},
	{
		href: '/upcoming',
		label: 'Upcoming',
		emptyState: 'Nothing upcoming yet.',
		icon: CalendarRange
	},
	{
		href: '/projects',
		label: 'Projects',
		emptyState: 'No projects yet.',
		icon: Folders
	},
	{
		href: '/active',
		label: 'Backlog',
		emptyState: 'Nothing is sitting in backlog.',
		icon: ListTodo
	},
	{
		href: '/completed',
		label: 'Completed',
		emptyState: 'No completed tasks yet.',
		icon: CheckCheck
	},
	{
		href: '/settings',
		label: 'Settings',
		emptyState: 'Connection settings will live here.',
		icon: Settings2
	}
];

export function getRouteMeta(pathname: string) {
	return appRoutes.find(
		(route) => pathname === route.href || pathname.startsWith(`${route.href}/`)
	);
}
