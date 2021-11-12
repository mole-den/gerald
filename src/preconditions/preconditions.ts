// @ts-nocheck
import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';

export class OwnerOnlyCondition extends sapphire.Precondition {
    constructor() {
        super({
            name: 'OwnerOnly',
        });
    }
    public async run(message: discord.Message) {
        let owners = process.env.OWNERS!.split(' ');
        let x = owners.includes(message.author.id);
        if (x) return this.ok();
        message.channel.send('This command is owner only.')
        return this.error(`This command can only be used by the owner.`); 
    };
}

declare module '@sapphire/framework' {
    interface Preconditions {
        OwnerOnly: never;
    }
}