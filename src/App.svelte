<script>
	let attackers = 0;
	let defenders = 0;
	let attackDices = [-1, -1, -1];
	let defendDices = [-1, -1, -1];


	const fight = () => {
		attackDices = [-1, -1, -1];
		defendDices = [-1, -1, -1];

		
		diceThrow();

	}

	function diceThrow() {
		let dice = Math.ceil( Math.random() *6 );
		console.log(dice);
	}

	const reset = () => {
		attackers = 0;
		defenders = 0;
	}




</script>

<main>
	<h1>Risk Dice</h1>
	<p>Simply input the number of attackers and defenders anmd click fight to see who will win.</p>
	<label for="attackers">attackers</label>
	<input type="number" name="attackers" id="attackers" bind:value={attackers}>
	<label for="attackers">defenders</label>
	<input type="number" name="defenders" id="attackers" bind:value={defenders}>
	<br>

	<button on:click={fight}>fight</button>
	<button on:click={reset}>reset</button>


</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>