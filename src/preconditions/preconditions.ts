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
        if (process.env.OWNERS === undefined) {
            return this.error({message: 'No owners have been set.'});
        }
        let owners = process.env.OWNERS!.split(',');
        return owners.includes(message.author.id) ? this.ok() : this.error({ message: 'This command can only be used by the owner.' });
    };
}

declare module '@sapphire/framework' {
    interface Preconditions {
        OwnerOnly: never;
    }
}