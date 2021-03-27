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
                      <img class="att" src="/images/nodice.svg" alt="nodice">
                    </td>
                {:else if dice === 1}
                  <td>
                    <img class="att" src="/images/diceone.svg" alt="one">
                  </td>
                {:else if dice === 2}
                  <td>
                    <img class="att" src="/images/dicetwo.svg" alt="two">
                  </td>
                {:else if dice === 3}
                  <td>
                    <img class="att" src="/images/dicethree.svg" alt="three">
                  </td>
                {:else if dice === 4}
                  <td>
                    <img class="att" src="/images/dicefour.svg" alt="four">
                  </td>
                {:else if dice === 5}
                  <td>
                    <img class="att" src="/images/dicefive.svg" alt="five">
                  </td>
                {:else if dice === 6}
                  <td>
                    <img class="att" src="/images/dicesix.svg" alt="six">
                  </td>
                {/if}
            {/each}
          </tr>
          <tr style="color: #006494">
            <td>Defender</td>
            {#each fight.defenderdice as dice}
                {#if dice === -1}
                    <td>
                      <img class="def" src="/images/nodice.svg" alt="nodice">
                    </td>
                    {:else if dice === 1}
                    <td>
                      <img class="def" src="/images/diceone.svg" alt="one">
                    </td>
                  {:else if dice === 2}
                    <td>
                      <img class="def" src="/images/dicetwo.svg" alt="two">
                    </td>
                  {:else if dice === 3}
                    <td>
                      <img class="def" src="/images/dicethree.svg" alt="three">
                    </td>
                  {:else if dice === 4}
                    <td>
                      <img class="def" src="/images/dicefour.svg" alt="four">
                    </td>
                  {:else if dice === 5}
                    <td>
                      <img class="def" src="/images/dicefive.svg" alt="five">
                    </td>
                  {:else if dice === 6}
                    <td>
                      <img class="def" src="/images/dicesix.svg" alt="six">
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

    .att {
      /*filter: invert(42%) sepia(73%) saturate(7500%) hue-rotate(339deg) brightness(93%) contrast(101%);*/
    }

    .def {
      /*filter: invert(19%) sepia(41%) saturate(6219%) hue-rotate(184deg) brightness(94%) contrast(101%);*/
    }
</style>