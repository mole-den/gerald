// @ts-nocheck
import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';
export class COMMANDNAMECommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'command name',
            aliases: ['alternate name 1', 'alternate name 2'],
            description: 'short desc',
            examples: ['command usage'],
            detailedDescription: 'desc displayed when help command is called',
            requiredUserPermissions: ['perms user needs to execute command, can be empty'],
            requiredClientPermissions: ['perms bot needs to execute command, can be empty'],
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message) {
        // command code
    }
}
