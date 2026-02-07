<script lang="ts">
    import { Label, Textarea } from "flowbite-svelte";

    let {
        id,
        label,
        placeholder,
        value = $bindable(""),
        oninput,
        readonly,
    }: {
        id: string;
        label: string;
        placeholder?: string;
        value?: string;
        oninput?: (event: Event) => void;
        readonly?: boolean,
    } = $props();
</script>

<div>
    <Label for={id} class="mb-2 block">{label}</Label>
    <Textarea readonly={readonly} {id} class="h-80 w-full" {placeholder} {oninput} {value} />
</div>
