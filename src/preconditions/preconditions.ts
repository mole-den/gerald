import { Precondition, PreconditionOptions,  Command, Identifiers, Argument} from '@sapphire/framework';
import { Message } from 'discord.js';
import { prisma } from '../index';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<PreconditionOptions>({
    name: 'OwnerOnly',
})
export class OwnerOnlyCondition extends Precondition {
    public async messageRun(message: Message)     {
        return (process.env.OWNERS!.split(' ').includes(message.author.id)) ? this.ok()
        : this.error({ message: `This command is owner only.`, context: { silent: true } });
    };
}
declare module '@sapphire/framework' {
    interface Preconditions {
        OwnerOnly: never;
    }
}

@ApplyOptions<PreconditionOptions>({
    name: 'disabled',
    position: 1,
})
export class checkDisabledCondition extends Precondition {
    public async messageRun(message: Message, command: Command) {
        if (message.channel.type === 'DM') return this.ok()
        let disabled = (await prisma.guild.findUnique({ where: { guildId: message.guildId! } }))!.disabled!
        if (disabled.some(x => x === command.name)) return this.error({
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

export class BigIntArgument extends Argument<BigInt> {
    public run(parameter: string) {
        if (Number.isNaN(Number(parameter))) {
            return this.error({
                parameter,
                message: 'The provided argument could not be resolved to a valid integer.',
                identifier: Identifiers.ArgumentNumberError
              });
          
        }
        return this.ok(BigInt(parameter))
    }
}

declare module '@sapphire/framework' {
    interface ArgType {
        bigInt: BigInt;
    }
}
