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
            preconditions: []
        });
    };
    public async messageRun(message: discord.Message) {
        return message.channel.send('test');
    };
}

export class ownerDisableCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'dismount',
            description: 'Disables a command globally',
            requiredClientPermissions: [],
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let cmd = args.next();
        let command = this.container.stores.get('commands').find(value => value.name === cmd);
        if (!command) return message.channel.send('Command not found');
        command.unload();
        return message.channel.send(`Dismounted *${cmd}*`);
    };
}

export class ownerEnableCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'mount',
            description: 'Enables a command globally',
            requiredClientPermissions: [],
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let cmd = args.next();
        let command = this.container.stores.get('commands').find(value => value.name === cmd);
        if (!command) return message.channel.send('Command not found');
        command.reload();
        return message.channel.send(`Mounted *${cmd}*`);
    };
};

export class ownerEvalCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'eval',
            description: 'Evaluates JS input',
            requiredClientPermissions: [],
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message) {
        let str = message.content;
        let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
        try {
            eval(out);
        } catch (error) {
            console.log("error");
            console.log(error);
            message.channel.send(`Unhandled exception: \n ${error}`);
        }
    };
}