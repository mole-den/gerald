import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';
import { cacheType, db, guildDataCache } from '../index';
import { ApplyOptions } from '@sapphire/decorators';
db;
///<reference types="../index"/>

@ApplyOptions<sapphire.PreconditionOptions>({
    name: 'OwnerOnly',
})
export class OwnerOnlyCondition extends sapphire.Precondition {
    public async run(message: discord.Message) {
        let owners = process.env.OWNERS!.split(' ');
        let x = owners.includes(message.author.id);
        if (x) return this.ok();
        return this.error({ message: `This command is owner only.` });
    };
}

declare module '@sapphire/framework' {
    interface Preconditions {
        OwnerOnly: never;
    }
}

@ApplyOptions<sapphire.PreconditionOptions>({
    name: 'override',
})
export class overrideCondition extends sapphire.Precondition {
    public async run(message: discord.Message) {
        /*parent:
        command.preconditions.entries.forEach(async (item) => {
            if (item instanceof sapphire.PreconditionContainerArray) {
                let i = item.entries.filter(x => x.name === 'UserPermissions');
                i.forEach(async (item) => {
                    let result = await item.run()
                    if (result.error) {
                        message.channel.send(result.error.message);
                        break parent;
                    }
                })
            }
        });*/
        let owners = process.env.OWNERS!.split(' ');
        let x = owners.includes(message.author.id);
        if (!x) return this.error();
        //message.channel.send(`**Permissions have been overwritten as you are the bot owner.**`)
        return this.ok();
    };
}

declare module '@sapphire/framework' {
    interface Preconditions {
        override: never;
    }
}

@ApplyOptions<sapphire.PreconditionOptions>({
    name: 'disabled',
    enabled: true,
    position: 1,
})

export class checkDisabledCondition extends sapphire.Precondition {
    public async run(message: discord.Message, command: sapphire.Command) {
        let x = await guildDataCache.get(message.guild!.id, cacheType.disabled)

        if (x !== null && command.name in x) return this.error();
        return this.ok();
    };
}

declare module '@sapphire/framework' {
    interface Preconditions {
        disabled: never;
    }
}

export class dismountPrecondition extends sapphire.CorePreconditions.Enabled {
    public run(_: discord.Message, command: sapphire.Command, context: sapphire.Precondition.Context): sapphire.Precondition.Result {
        return command.enabled ? this.ok() : this.error({ 
            identifier: sapphire.Identifiers.CommandDisabled, 
            message: '', 
            context: { ...context, silent: true } 
        });
}}
