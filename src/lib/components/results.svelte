<script>
	import { fade } from 'svelte/transition';
	import Fightstats from './fightstats.svelte';
	export let round;
	export let message;
	export let fights = [];

	let showDetails = false;

	const toggleDetails = () => {
		showDetails = !showDetails;
	};
</script>

<div class="results">
	<div on:click={toggleDetails} style="width: 278px; cursor: pointer;">
		<div class="dropdown u-pull-left">
			{#if showDetails}
				<img src="/images/arrowup.svg" alt="dropdown" in:fade />
			{:else}
				<img src="/images/arrowdown.svg" alt="dropdown" in:fade />
			{/if}
		</div>
		Round {round} : {message}
	</div>
	{#if showDetails}
		{#each fights as fight}
			<Fightstats {fight} />
		{/each}
	{/if}
</div>

<style>
	.results {
		border-radius: 4px;
		margin: 10px auto;
		display: table;
		box-shadow: 2px 2px 4px 2px rgba(208, 208, 208, 0.5);
		transition: 0.5s;
	}

	.dropdown {
		width: 20px;
		height: 20px;
		margin-left: 8px;
		box-sizing: border-box;
	}
</style>
