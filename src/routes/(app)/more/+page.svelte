<script lang="ts">
	import AppSidebar from '$lib/components/app/app-sidebar.svelte';
</script>

<section class="mx-auto w-full max-w-[26rem] lg:hidden">
	<AppSidebar
		browseSectionCollapsible={false}
		hidePrimaryRoutes
		supportHref="/support"
		showHeaderAction={false}
		class="rounded-[1.8rem] border border-border/70 bg-background/96 shadow-sm"
	/>
</section>
