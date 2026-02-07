<script lang="ts">
  import { Button, Card, Modal, Textarea, Checkbox } from "flowbite-svelte";
  import { browser } from "$app/environment";
  import type { Save, Character } from "$lib/models";
  import IOArea from "$lib/components/IOArea.svelte";

  const save = browser ? localStorage.getItem("save-1") : null;
  const initialList: Save = { name: "Default", pending: [], sorted: [], saved: [] };
  const parsedSave = save ? JSON.parse(save) : null;
  if (parsedSave) {
    initialList.name = parsedSave.name || initialList.name;
    initialList.pending = parsedSave.pending || initialList.pending;
    initialList.sorted = parsedSave.sorted || initialList.sorted;
    initialList.saved = parsedSave.saved || initialList.saved;
  }
  let list: Save = $state(initialList);
  let parsedList: Character[] = $state([]);
  let showOverwriteModal = $state(false);

  $inspect(list);

  const parseLine = (line: string) => {
    var res = /(?<name>.+?)(?: \| (?<note>.+))? - (?<img>https:[^\s]+)$/.exec(line);
    var character: Character = {
      name: res?.groups?.name || "",
      note: res?.groups?.note || "",
      img: res?.groups?.img || "",
    };
    return character;
  };

  const parseInput = (event: Event) => {
    console.log("Parsing input...");
    // Parse the input and update the list
    const input = (event.target as HTMLInputElement).value;
    const items = input
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const parsed = parseLine(x);
        if (!parsed.name) {
          console.warn(`Invalid line skipped: "${x}"`);
        }
        return parsed;
      })
      .filter((x) => x.name);
    parsedList = [...items];
  };

  const addToPending = () => {
    console.log("Importing list...");
    let alreadyAdded = list.pending.map((x) => x.name).concat(list.sorted.map((x) => x.name));
    list.pending = [...list.pending, ...parsedList.filter((x) => !alreadyAdded.some((y) => y === x.name))];
    localStorage.setItem("save-1", JSON.stringify(list));
  };

  // svelte-ignore state_referenced_locally
  let pendingCharacter = $state<Character | null>(null);
  let sortedCharacter = $state<Character | null>(null);

  const selectComparisonCharacter = (pending: Character) => {
    console.log(pending.progress);
    const eligible = list.sorted
      .filter(
        (x) =>
          x.score !== undefined &&
          x.score > (pending.progress?.minScore != undefined ? pending.progress?.minScore : -Infinity) &&
          x.score < (pending.progress?.maxScore != undefined ? pending.progress?.maxScore : Infinity),
      )
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    sortedCharacter = eligible.length > 0 ? eligible[Math.floor(eligible.length / 2)] : null;
  };

  const completeSort = () => {
    console.log("Sorting complete!");
    if (!pendingCharacter) {
      return;
    }
    list.sorted.push(pendingCharacter);
    list.sorted = list.sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
    list.pending = list.pending.filter((x) => x.name !== pendingCharacter?.name);
    pendingCharacter = list.pending[0] || null;
    selectComparisonCharacter(pendingCharacter);
    localStorage.setItem("save-1", JSON.stringify(list));
  };

  const startSorting = () => {
    console.log("Starting sorting mode...");
    pendingCharacter = list.pending[0] || null;
    selectComparisonCharacter(pendingCharacter);
  };

  const saveSorting = () => {
    console.log("Saving sorting...");
    list.saved = [...list.sorted];
    localStorage.setItem("save-1", JSON.stringify(list));
  };

  const deleteSorted = () => {
    console.log("Deleting sorted characters...");
    list.sorted = list.saved;
    localStorage.setItem("save-1", JSON.stringify(list));
  };

  const deleteSaved = () => {
    console.log("Deleting saved characters...");
    list.saved = [];
    localStorage.setItem("save-1", JSON.stringify(list));
  };

  const overwriteState = ({ action, data }: { action: string; data: FormData }) => {
    if (action === "overwrite") {
      const json = data.get("json") as string;
      try {
        const parsed = JSON.parse(json);
        list = parsed;
        localStorage.setItem("save-1", JSON.stringify(list));
      } catch (e) {
        console.error("Invalid JSON, overwrite cancelled.", e);
      }
    }
    showOverwriteModal = false;
  };

  const higherThanComparison = () => {
    if (!pendingCharacter) return;
    const maxScore = pendingCharacter.progress?.maxScore;
    let newMinScore = 100000;
    if (sortedCharacter) {
      newMinScore = sortedCharacter.score !== undefined ? sortedCharacter.score : newMinScore;
      pendingCharacter.progress = {
        minScore: newMinScore,
        maxScore: maxScore,
      };
      selectComparisonCharacter(pendingCharacter);
    }

    if (!sortedCharacter) {
      const range = maxScore !== undefined ? (maxScore - newMinScore) / 2 : 1000;
      pendingCharacter.score = newMinScore + range;
      completeSort();
    }
  };

  const lowerThanComparison = () => {
    if (!pendingCharacter) return;
    let newMaxScore = 100000;
    const minScore = pendingCharacter.progress?.minScore;

    if (sortedCharacter) {
      newMaxScore = sortedCharacter.score !== undefined ? sortedCharacter.score : newMaxScore;
      pendingCharacter.progress = {
        minScore: minScore,
        maxScore: newMaxScore,
      };
      selectComparisonCharacter(pendingCharacter);
    }
    if (!sortedCharacter) {
      const range = minScore !== undefined ? (newMaxScore - minScore) / 2 : 1000;
      pendingCharacter.score = newMaxScore - range;
      completeSort();
    }
  };

  const generateSortCommands = (diff: boolean) => {
    if (!list.sorted.length) {
      return "";
    }
    if (!diff) {
      const workingList = [...list.sorted].sort((a, b) => b.score! - a.score!);
      const firstMarry = workingList.shift()!.name;
      const commands = [`$firstmarry ${firstMarry}`];
      let nextCommand = `$smp ${firstMarry}`;
      for (let i = 0; i < workingList.length; i++) {
        const char = workingList[i].name!;
        if (nextCommand.length + char.length + 1 > 2000) {
          commands.push(nextCommand);
          nextCommand = `$smp ${char}`;
        } else {
          nextCommand += `$${char}`;
        }
      }
      if (nextCommand.lastIndexOf("$") > 0) {
        commands.push(nextCommand);
      }
      return commands.join("\n\n");
    } else {
      const workingList = [...list.sorted].sort((a, b) => b.score! - a.score!);
      const savedList = [...list.saved].sort((a, b) => b.score! - a.score!);
      const commands = [];
      let foundDiff = false;
      let nextCommand = ``;
      for (let i = 0; i < workingList.length; i++) {
        const char = workingList[i];
        const savedChar = savedList[i];
        if (char.name === savedChar?.name && !foundDiff) {
          nextCommand = `$smp ${char.name}`;
          continue;
        }
        foundDiff = true;
        if (nextCommand.length + char.name.length + 1 > 2000) {
          commands.push(nextCommand);
          nextCommand = `$smp ${char.name}`;
        } else {
          nextCommand += `$${char.name}`;
        }
      }
      if (nextCommand.lastIndexOf("$") > 0) {
        commands.push(nextCommand);
      }
      return commands.join("\n");
    }
  };

  let parsed = $derived(parsedList.map((x: Character) => `${x.name}`).join("\n"));
  let pending = $derived(list.pending.map((x: Character) => `${x.name}`).join("\n"));
  let sorted = $derived(list.sorted.map((x: Character) => `${x.name}`).join("\n"));
  let previous = $derived(list.saved.map((x: Character) => `${x.name}`).join("\n"));
  let diff = $derived(generateSortCommands(true));
  let full = $derived(generateSortCommands(false));
  let jsonState = $derived(JSON.stringify(list, null, 2));
</script>

<div class="grid grid-cols-8 gap-4">
  <IOArea id="input" label="Input result from Mudae" placeholder="use $mmi-sm" oninput={parseInput} />
  <IOArea id="parsed" label="Parsed characters" bind:value={parsed} readonly />
  <IOArea id="pending" label="Pending sorting" bind:value={pending} readonly />
  <IOArea id="sorted" label="Sorted characters" bind:value={sorted} readonly />
  <IOArea id="previous" label="Last saved sort" bind:value={previous} readonly />
  <IOArea id="diff" label="Sortcommands vs last save" bind:value={diff} readonly />
  <IOArea id="full" label="Full sort commands" bind:value={full} readonly />
  <IOArea id="jsonState" label="Raw JSON state" bind:value={jsonState} readonly />
</div>
<div class="grid grid-cols-8 gap-4">
  <div></div>
  <Button outline color="dark" onclick={addToPending}>Add to pending</Button>
  <Button outline color="dark" onclick={startSorting}>Start sorting</Button>
  <Button outline color="red" onclick={deleteSorted}>Reset to saved</Button>
  <Button outline color="red" onclick={deleteSaved}>Delete saved</Button>
  <div></div>
  <Button outline color="dark" onclick={saveSorting}>Save sorting</Button>
  <Button outline color="orange" onclick={() => (showOverwriteModal = true)}>Overwrite</Button>
</div>

<Modal title="Overwrite JSON state" form bind:open={showOverwriteModal} onaction={overwriteState}>
  <Textarea class="w-full h-100" name="json"></Textarea>
  <Checkbox name="confirm" class="mt-2" required>I'm not missclicking.</Checkbox>
  {#snippet footer()}
    <Button type="submit" value="overwrite" color="orange">Overwrite</Button>
    <Button color="alternative" onclick={() => (showOverwriteModal = false)}>Cancel</Button>
  {/snippet}
</Modal>

{#if pendingCharacter}
  <div class="grid grid-cols-6 gap-4 justify-center">
    <div></div>
    <div></div>
    <Card class="w-50">
      <img src={pendingCharacter.img} alt={pendingCharacter.name} class="h-auto max-w-50" />
      <div class="p-2">
        <div class="h-20">
          <p class="h-15 overflow-auto font-bold text-gray-900 dark:text-white">
            {pendingCharacter.name}
          </p>
          {#if pendingCharacter.note}
            <p class="h-full font-normal text-gray-700 dark:text-gray-400">
              {pendingCharacter.note}
            </p>
          {/if}
        </div>
        <Button onclick={higherThanComparison} class="mt-2 w-full" color="green">Higher</Button>
        <Button onclick={lowerThanComparison} class="mt-2 w-full" color="blue">Lower</Button>
      </div>
    </Card>
    {#if sortedCharacter}
      <Card class="w-50">
        <img src={sortedCharacter.img} alt={sortedCharacter.name} class="h-auto max-w-full" />
        <div class="p-2">
          <h5 class="font-bold text-gray-900 dark:text-white">
            {sortedCharacter.name}
          </h5>
          {#if sortedCharacter.note}
            <p class="font-normal text-gray-700 dark:text-gray-400">
              {sortedCharacter.note}
            </p>
          {/if}
        </div>
      </Card>
    {/if}
  </div>
{/if}
