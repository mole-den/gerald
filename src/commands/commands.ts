import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';
import * as pg from 'pg';

const db = new pg.Pool({
    connectionString: <string>process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export class testCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'test',
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
        let cmd = args.nextMaybe();
        if (!cmd.exists) return
        let command = this.container.stores.get('commands').find(value => value.name === cmd.value);
        if (!command) return message.channel.send('Command not found');
        command.enabled = false;
        return message.channel.send(`Dismounted *${cmd.value}*`);
    };
}

export class ownerEnableCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'mount',
            description: 'Enables a command globally',
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let cmd = args.next();
        let command = this.container.stores.get('commands').find(value => value.name === cmd);
        if (!command) return message.channel.send('Command not found');
        command.enabled = true;
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
};

export class DeletedMSGCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'deleted',
            description: 'Deletes a message',
            requiredClientPermissions: [],
            preconditions: [new sapphire.UserPermissionsPrecondition('MANAGE_MESSAGES'), 'GuildOnly']
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let arg = args.nextMaybe();
        if (!arg.exists) return message.channel.send('Please specify amount of messages to view.');
        let amount = parseInt(arg.value);
        if (isNaN(amount)) return message.channel.send('Please specify a valid amount of messages to view.');
        let del = await db.query('SELECT * FROM deletedmsgs WHERE guildid=$2 ORDER BY msgtime DESC LIMIT $1;',
            [amount, message.guildId]);
        del.rows.forEach(async (msg) => {
            const DeleteEmbed = new discord.MessageEmbed()
                .setTitle("Deleted Message")
                .setColor("#fc3c3c")
                .addField("Author", `<@${msg.author}>`, true)
                .addField("Deleted By", msg.deleted_by, true)
                .addField("Channel", `<#${msg.channel}>`, true)
                .addField("Message", msg.content || "None")
                .setFooter(`Message ID: ${msg.msgid} | Author ID: ${msg.author}`);
            message.channel.send({
                embeds: [DeleteEmbed]
            })
        });
        return;
    };
}