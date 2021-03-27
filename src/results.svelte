<script>
    import { fade } from 'svelte/transition';
    import Fightstats from './Fightstats.svelte';
    export let round;
    export let message;
    export let fights = [];


    let showDetails = false;

    const toggleDetails = () => {
        showDetails = !showDetails;
    }


</script>

<div class="results">
    <div on:click={toggleDetails} style="width: 278px">
        <div class="dropdown u-pull-left">
            {#if showDetails}
            <img src="/images/arrowup.svg" alt="dropdown" in:fade>
            {:else}
            <img src="/images/arrowdown.svg" alt="dropdown" in:fade>
            {/if}
        </div>
        Round {round} : {message}    
    </div>
    {#if showDetails}
        {#each fights as fight}
            <Fightstats fight={fight}/>
        {/each}
    {/if}
</div>

<style>
    .results{
        border-radius: 4px;
        border: 1px solid #bbb;
        margin: 8px auto;
        display: table;
        cursor: pointer;
    }

    .dropdown {
        width: 20px;
        height: 20px;
        margin-left: 8px;
        box-sizing: border-box;
    }


</style>