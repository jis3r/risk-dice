<script>
	import { createEventDispatcher } from 'svelte';

	export let troops = 0;

	const dispatch = createEventDispatcher();

	const reductTroops = () => {
		if (troops > 0) troops--;
		changeValue();
	};

	const addTroops = () => {
		troops++;
		changeValue();
	};

	const changeValue = () => {
		dispatch('valuechange', troops);
	};
</script>

<div class="inputfield">
	<div on:click={reductTroops} class="reduct u-pull-left">
		<img src="/images/minus.svg" alt="minus" />
	</div>
	<div class="value u-pull-left">{troops}</div>
	<div on:click={addTroops} class="add u-pull-left">
		<img src="/images/plus.svg" alt="plus" />
	</div>
</div>

<style>
	.inputfield {
		width: 210px;
		height: 40px;
		border-radius: 4px;
		/*border: 1px solid #bbb;*/
		box-shadow: 2px 2px 4px 2px rgba(208, 208, 208, 0.5);
		margin: 0 auto;
	}

	.reduct {
		width: 69px;
		height: 100%;
		text-align: center;
		vertical-align: middle;
		border-right: 1px solid #bbb;
	}

	.value {
		width: 70px;
		height: 100%;
		text-align: center;
		vertical-align: middle;
		font-size: x-large;
	}

	.add {
		width: 69px;
		height: 100%;
		text-align: center;
		vertical-align: middle;
		border-left: 1px solid #bbb;
	}

	img {
		width: 20px;
		height: 20px;
		margin: 10px 25px 10px 25px;
	}
</style>
