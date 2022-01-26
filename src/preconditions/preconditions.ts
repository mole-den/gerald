import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';
import { db } from '../index';
import { ApplyOptions } from '@sapphire/decorators';
///<reference types="../index"/>

@ApplyOptions<sapphire.PreconditionOptions>({
    name: 'OwnerOnly',
})
export class OwnerOnlyCondition extends sapphire.Precondition {
    public async run(message: discord.Message) {
        let owners = process.env.OWNERS!.split(' ');
        let x = owners.includes(message.author.id);
        if (x) return this.ok();
        return this.error({ message: `This command is owner only.`, context: {silent: true} });
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
        if (message.channel.type === 'DM') return this.ok()
        let disabled = <string>(await db.query('SELECT disabled FROM guilds WHERE guildid = $1', [message.guild!.id])).rows[0].disabled;
        let x = disabled.split(' ');
        if (x.some(x => x === command.name)) return this.error({
            message: `This command is disabled in this server.`,
            identifier: 'diabled',
            context: {
                silent: true,
            },
        });
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
        command.enabled ? _.channel.sendTyping() : null;
        return command.enabled ? this.ok() : this.error({ 
            identifier: sapphire.Identifiers.CommandDisabled, 
            message: '', 
            context: { ...context, silent: true } 
        }); 
}}
