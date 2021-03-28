<script>
    export let fight = {
		turn: -1,
		attackerdice: [],
		defenderdice: []
	}

</script>

<div class="fight">
    Fight {fight.turn}
    <table>
        <thead>
          <tr>
            <th>Player</th>
            <th style="text-align: center;">1</th>
            <th style="text-align: center;">2</th>
            <th style="text-align: center;">3</th>
          </tr>
        </thead>
        <tbody>
          <tr style="color: #ef233c">
            <td>Attacker</td>
            {#each fight.attackerdice as dice}
                {#if dice === -1}
                    <td>
                      <img src="/images/nodicered.svg" alt="X">
                    </td>
                {:else if dice === 1}
                  <td>
                    <img src="/images/diceonered.svg" alt="1">
                  </td>
                {:else if dice === 2}
                  <td>
                    <img src="/images/dicetwored.svg" alt="2">
                  </td>
                {:else if dice === 3}
                  <td>
                    <img src="/images/dicethreered.svg" alt="3">
                  </td>
                {:else if dice === 4}
                  <td>
                    <img src="/images/dicefourred.svg" alt="4">
                  </td>
                {:else if dice === 5}
                  <td>
                    <img src="/images/dicefivered.svg" alt="5">
                  </td>
                {:else if dice === 6}
                  <td>
                    <img src="/images/dicesixred.svg" alt="6">
                  </td>
                {/if}
            {/each}
          </tr>
          <tr style="color: #006494">
            <td>Defender</td>
            {#each fight.defenderdice as dice}
                {#if dice === -1}
                    <td>
                      <img src="/images/nodiceblue.svg" alt="X">
                    </td>
                    {:else if dice === 1}
                    <td>
                      <img src="/images/diceoneblue.svg" alt="1">
                    </td>
                  {:else if dice === 2}
                    <td>
                      <img src="/images/dicetwoblue.svg" alt="2">
                    </td>
                  {:else if dice === 3}
                    <td>
                      <img src="/images/dicethreeblue.svg" alt="3">
                    </td>
                  {:else if dice === 4}
                    <td>
                      <img src="/images/dicefourblue.svg" alt="4">
                    </td>
                  {:else if dice === 5}
                    <td>
                      <img src="/images/dicefiveblue.svg" alt="5">
                    </td>
                  {:else if dice === 6}
                    <td>
                      <img src="/images/dicesixblue.svg" alt="6">
                    </td>
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
        margin: 5px;
        padding: 5px 10px;
    }

    img {
      width: 30px;
      height: 30px;
    }
</style>