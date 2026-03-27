<script lang="ts">
	import { page } from '$app/state';
	import SavedFilterTaskPage from '$lib/components/filters/SavedFilterTaskPage.svelte';

	const filterId = $derived(Number(page.params.filterId));
</script>

<SavedFilterTaskPage {filterId} />
