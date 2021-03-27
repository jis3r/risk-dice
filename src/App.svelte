<script>
	import Results from './Results.svelte';

	let attackers = 0;
	let defenders = 0;
	let attackUnit = 0;
	let defendUnit = 0;
	let winner = -1;

	let attackDice = [-1, -1, -1];
	let defendDice = [-1, -1, -1];

	let boxes = [];
	let round = 0;

	let fightnumber = 0;
	let fights = [];

	const fight = () => {
		attackDice = [-1, -1, -1];
		defendDice = [-1, -1, -1];

		setFightingSoliders();
		//console.log(`attackUnit ${attackUnit} \t defendUnit ${defendUnit}`);
		throwDice();

		attackDice.sort(function(a, b){return b - a});
		defendDice.sort(function(a, b){return b - a});

		compareResults();
		setFightdata();

		if( attackers === 0 ) {
			winner = 1;
			setResults("The defender won!");
			fightnumber = 0;
		}
		else if( defenders === 0 ) {
			winner = 0;
			setResults("The attacker won!");
			fightnumber = 0;
		}
		else {
			fight();
		}
	}

	function setResults(msg) {
		round++
		let newBox = {
			round: round,
			message: msg,
			fights: fights
		}
		boxes = [newBox, ...boxes]
		console.log(boxes);
		fights = [];
	}

	function setFightdata() {
		fightnumber++;
		let newFightdata = {
			turn: fightnumber,
			attackerdice: attackDice,
			defenderdice: defendDice
		}
		fights = [...fights, newFightdata]
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
		for(let i = 0; i < defendUnit; i++) {
			defendDice[i] = dice();
		}
		for(let i = 0; i < attackUnit; i++) {
			attackDice[i] = dice();
		}
	}

	function dice() {
		let dice = Math.ceil( Math.random() *6 );
		//console.log(dice);
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
		attackUnit = 0;
		defendUnit = 0;
		winner = -1;
	}

	const reductAtt = () => {
		if(attackers > 0) attackers--;
	}

	const addAtt = () => {
		attackers++;
	}

	const reductDef = () => {
		if(defenders > 0) defenders--;
	}

	const addDef = () => {
		defenders++;
	}
</script>

<main>
	<div class="container">
		<div class="row">
			<div class="twelve columns">
				<h1 class="centered">Risk Dice</h1>
			</div>
		</div>
		<div class="row">
			<div class="twelve columns">
				<p class="centered">Simply input the number of attackers and defenders and click fight to see who will win.</p>
			</div>
		</div>

		<div class="row">
			<div class="twelve columns">
				<div class="centered">attackers</div>
			</div>
		</div>
		<div class="row">
			<div class="twelve columns">
				<div class="centered">
					<button class="button" on:click={reductAtt}>-</button>
					<button class="button" id="attackers" disabled>{attackers}</button>
					<button class="button" on:click={addAtt}>+</button>
				</div>
			</div>
		</div>
		<div class="row">
			<div class="twelve columns">
				<div class="centered">defenders</div>
			</div>
		</div>
		<div class="row">
			<div class="twelve columns">
				<div class="centered">
					<button class="button" on:click={reductDef}>-</button>
					<button class="button" id="defenders" disabled>{defenders}</button>
					<button class="button" on:click={addDef}>+</button>
				</div>
			</div>
		</div>
		<div class="row">
			<div class="twelve columns">
				<div class="centered">
					<button class="button" on:click={fight}>fight</button>
					<button class="button" on:click={reset}>reset</button>
				</div>
			</div>
		</div>
		<div class="row">
			<div class="twelve columns">
				<div class="centered">
					{#if winner === 0}
					<h3>The attacker won!</h3>
					{:else if winner === 1}
					<h3>The defender won!</h3>
					{/if}
				</div>
			</div>
		</div>

		<div class="row">
			<div class="twelve columns">
				{#each boxes as result }
					<Results	round={result.round} 
								message={result.message + "         "}
								fights={result.fights} />
				{/each}
			</div>
		</div>	
	</div>
</main>

<style>
	.centered {
		text-align: center;
		margin-left: auto;
		margin-right: auto;
	}
</style>