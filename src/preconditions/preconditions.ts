import { Precondition, PreconditionOptions} from '@sapphire/framework';
import { Message } from 'discord.js';
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
    position: 10,
})
export class checkDisabledCondition extends Precondition {
    public async messageRun() {
        return this.ok();
    };
    public async chatInputRun() {
        return this.ok()
    }

}

declare module '@sapphire/framework' {
    interface Preconditions {
        disabled: never;
    }
}