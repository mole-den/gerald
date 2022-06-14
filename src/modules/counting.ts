import { Module } from "../commandClass";

export class Counting extends Module {
    constructor() {
        super({
            name: "counting",
            description: "Counting",
            settings: [{
                id: "levelUpMsg",
                name: "Message sent on level up",
                type: "string",
                description: "Message sent when a user levels up. Use `{{user}}` to mention the user and `{{level}}` to get the user's new level.",
                default: "{{user}} is now level {{level}}."
            }, {
                id: "earnVcXp",
                name: "Earn xp from activty in voice channels.",
                type: "bool",
                default: true,
                description: "Earn xp from talking in voice channels and streaming."
            }]
        })
    }

    async load(): Promise<void> {
        
    }

    async unload(): Promise<void> {
        
    }
}