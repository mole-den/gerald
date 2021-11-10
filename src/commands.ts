import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';

export class testCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'test',
            aliases: ['alternate name 1', 'alternate name 2'],
            description: 'short desc',
            detailedDescription: 'desc displayed when help command is called',
            requiredClientPermissions: [],
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message) {
        message.channel.send('test');
    };
}
