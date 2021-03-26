<script>
    export let fight = {
		turn: -1,
		attackerdice: [],
		defenderdice: []
	}

</script>

<div class="fight">
    Fight {fight.turn}
    <br>
    <table class="u-full-width">
        <thead>
          <tr>
            <th>Player</th>
            <th>Dice 1</th>
            <th>Dice 2</th>
            <th>Dice 3</th>
          </tr>
        </thead>
        <tbody>
          <tr style="color: #ef233c">
            <td>Attacker</td>
            {#each fight.attackerdice as dice}
                {#if dice === -1}
                    <td>x</td>
                {:else}
                    <td>{dice}</td>
                {/if}
            {/each}
          </tr>
          <tr style="color: #006494">
            <td>Defender</td>
            {#each fight.defenderdice as dice}
                {#if dice === -1}
                    <td>x</td>
                {:else}
                    <td>{dice}</td>
                {/if}
            {/each}
          </tr>
        </tbody>
      </table>

</div>

<style>
    .fight {
        border-radius: 4px;
        border: 1px solid #bbb;
        margin: 4px;
        padding-left: 4px;
        padding-right: 4px;

    }
</style>