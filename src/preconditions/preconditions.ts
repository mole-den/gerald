import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';
import { db } from '../index';
import { ApplyOptions } from '@sapphire/decorators';
db;

@ApplyOptions<sapphire.PreconditionOptions>({
    name: 'OwnerOnly',
})
export class OwnerOnlyCondition extends sapphire.Precondition {
    public async run(message: discord.Message) {
        let owners = process.env.OWNERS!.split(' ');
        let x = owners.includes(message.author.id);
        if (x) return this.ok();
        return this.error({message: `This command is owner only.`}); 
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
/*
@ApplyOptions<sapphire.PreconditionOptions>({
    name: 'disabled',
    enabled: true,
    position: 1,
})
export class checkDisabledCondition extends sapphire.Precondition {
    public async run(message: discord.Message) {
        
        return this.ok();
    };
}

declare module '@sapphire/framework' {
    interface Preconditions {
        disabled: never;
    }
}
*/