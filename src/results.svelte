<script>
    import { fade } from 'svelte/transition';
    import Fightstats from './Fightstats.svelte';
    export let round;
    export let message;
    export let fights = [1, 2, 3, 4, 5, 6, 7, 8];

    let showDetails = false;

    const toggleDetails = () => {
        showDetails = !showDetails;
    }


</script>

<div class="results">
    <div on:click={toggleDetails}>
        <div class="dropdown u-pull-left">
            {#if showDetails}
            <img src="/images/arrowup.svg" alt="dropdown" in:fade>
            {:else}
            <img src="/images/arrowdown.svg" alt="dropdown" in:fade>
            {/if}
        </div>
        <div>
            Round {round} : {message} 
            <br>
        </div>
    </div>
    {#if showDetails}
        {#each fights as fightnumber}
            <Fightstats fight={fightnumber}/>
        {/each}
    {/if}
</div>

<style>
    .results{
        border-radius: 4px;
        border: 1px solid #bbb;
        margin: 8px;
        box-sizing: border-box;
    }

    .dropdown {
        width: 20px;
        height: 20px;
        margin-left: 8px;
        box-sizing: border-box;
    }


</style>