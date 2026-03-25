import type { AppList, AppTask } from '$lib/api/vikunja';

export type ProjectTreeNode = {
	list: AppList;
	children: ProjectTreeNode[];
};

export type ProjectTreeEntry = {
	list: AppList;
	depth: number;
};

export function buildProjectTree(lists: AppList[]) {
	const visibleLists = lists.filter((list) => !list.isArchived);
	const nodes = new Map<number, ProjectTreeNode>();

	for (const list of visibleLists) {
		nodes.set(list.id, {
			list,
			children: []
		});
	}

	const roots: ProjectTreeNode[] = [];

	for (const list of visibleLists) {
		const node = nodes.get(list.id);

		if (!node) {
			continue;
		}

		const parentNode = list.parentId !== null ? nodes.get(list.parentId) : null;

		if (parentNode) {
			parentNode.children.push(node);
			continue;
		}

		roots.push(node);
	}

	sortTree(roots);
	return roots;
}

export function flattenProjectTree(nodes: ProjectTreeNode[], depth = 0): ProjectTreeEntry[] {
	return nodes.flatMap((node) => [
		{
			list: node.list,
			depth
		},
		...flattenProjectTree(node.children, depth + 1)
	]);
}

export function findProjectById(lists: AppList[], listId: number) {
	return lists.find((list) => list.id === listId) ?? null;
}

export function getDescendantProjectIds(lists: AppList[], listId: number) {
	const childrenByParent = new Map<number, number[]>();

	for (const list of lists) {
		if (list.parentId === null) {
			continue;
		}

		const childIds = childrenByParent.get(list.parentId) ?? [];
		childIds.push(list.id);
		childrenByParent.set(list.parentId, childIds);
	}

	const seen = new Set<number>();
	const queue = [listId];

	while (queue.length > 0) {
		const currentId = queue.shift();

		if (currentId === undefined || seen.has(currentId)) {
			continue;
		}

		seen.add(currentId);

		for (const childId of childrenByParent.get(currentId) ?? []) {
			queue.push(childId);
		}
	}

	return Array.from(seen);
}

export function countOpenTasksForProjectTree(tasks: AppTask[], projectIds: number[]) {
	const projectIdSet = new Set(projectIds);

	return tasks.filter(
		(task) => !task.completed && task.listId !== null && projectIdSet.has(task.listId)
	).length;
}

function sortTree(nodes: ProjectTreeNode[]) {
	nodes.sort((left, right) => left.list.title.localeCompare(right.list.title));

	for (const node of nodes) {
		sortTree(node.children);
	}
}
