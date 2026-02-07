export interface Character {
    name: string;
    img: string;
    note?: string;
    score?: number;
    progress?: {
        maxScore?: number;
        minScore?: number;
    };
}