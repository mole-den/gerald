// @ts-nocheck
import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';
import '../functions'

export class OwnerOnlyCondition extends sapphire.Precondition {
    constructor() {
        super({
            name: 'OwnerOnly',
        });
    }
    public async run(message: discord.Message, command: sapphire.Command) {
        let owners = process.env.OWNERS!.split(' ');
        let x = owners.includes(message.author.id);
        if (x) return this.ok();
        return this.error(`This command is owner only.`); 
    };
    
}

declare module '@sapphire/framework' {
    interface Preconditions {
        OwnerOnly: never;
    }
}

export class overrideCondition extends sapphire.Precondition {
    constructor() {
        super({
            name: 'override',
        });
    }
    public async run(message: discord.Message, command: sapphire.Command) {
        /*let preconditions = command.preconditions.entries
        preconditions.forEach(async (item) => {
            console.log(item instanceof sapphire.PreconditionContainerArray)
            let x = await item.run();
            x.success
        })*/
        let owners = process.env.OWNERS!.split(' ');
        let x = owners.includes(message.author.id);
        if (!x) return this.error();
        message.channel.send(`**Required permissions have been overwritten as you are the bot owner.**`)
        return this.ok();
    };
}

declare module '@sapphire/framework' {
    interface Preconditions {
        override: never;
    }
}