import type { Character } from "./character";

export interface Save {
    name: string;
    pending: Character[];
    sorted: Character[];
    saved: Character[];
}