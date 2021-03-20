<script>
	let attackers = 0;
	let defenders = 0;
	let attackUnit = 0;
	let defendUnit = 0;
	let winner = -1;

	let attackDice = [-1, -1, -1];
	let defendDice = [-1, -1, -1];


	const fight = () => {
		attackDice = [-1, -1, -1];
		defendDice = [-1, -1, -1];

		setFightingSoliders();

		throwDice();

		attackDice.sort(function(a, b){return b - a});
		defendDice.sort(function(a, b){return b - a});

		compareResults();

		if( attackers === 0) {
			winner = 1;
		}
		else if( defenders === 0) {
			winner = 0;
		}
		else {
			fight();
		}
	}

	function setFightingSoliders() {
		if(attackers >= 3) {
			attackUnit = 3;
			attackers = attackers - 3;
		}
		else {
			attackUnit = attackers;
			attackers = attackers - attackUnit;
		}
		if(defenders >= 2) {
			defendUnit = 2;
			defenders = defenders - 2;
		}
		else {
			defendUnit = defenders;
			defenders = defenders - defendUnit;
		}
	}

	function throwDice() {
		for(let i = 0; i < attackUnit; i++) {
			attackDice[i] = dice();

		}

		for(let i = 0; i < defendUnit; i++) {
			defendDice[i] = dice();
		}
	}

	function dice() {
		let dice = Math.ceil( Math.random() *6 );
		console.log(dice);

		return dice;
	}

	function compareResults() {
		for(let i = 0; i < 2; i++) {
			if(attackDice[i] !== -1 && defendDice[i] !== -1) {
				if(attackDice[i] > defendDice[i]) {
					defendUnit = defendUnit - 1;
				}
				else {
					attackUnit = attackUnit - 1;
				}
			}
		}

		attackers = attackers + attackUnit;
		defenders = defenders + defendUnit;

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

	{#if winner === 0}
	<h3>The attacker won!</h3>
	{:else if winner === 1}
	<h3>The defender won!</h3>
	{/if}



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