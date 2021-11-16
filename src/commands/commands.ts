import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';
import { db } from '../index'
import { SubCommandPluginCommand } from '@sapphire/plugin-subcommands';
import { durationToMS, guildDataCache } from '../functions';
let permissionsPrecondition = (...args: discord.PermissionResolvable[]) => {
    let preconditionArray: Array<sapphire.PreconditionEntryResolvable> = [];
    args.forEach((item) => {
        preconditionArray.push(new sapphire.UserPermissionsPrecondition(item))
    });
    preconditionArray.push('override')
    return preconditionArray
};


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
            description: '',
            requiredClientPermissions: [],
            preconditions: [permissionsPrecondition('MANAGE_MESSAGES'), 'GuildOnly']
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

};

export class smiteCommand extends SubCommandPluginCommand {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'smite',
            description: '',
            requiredClientPermissions: ['BAN_MEMBERS'],
            preconditions: [permissionsPrecondition('BAN_MEMBERS'), 'GuildOnly'],
            subCommands: ['add', 'remove', 'list', 'clear', {input: 'show', default: true }]

        });
    };

    public async add(message: discord.Message, args: sapphire.Args) {
        let user = await args.pick('member').catch(() => {
            return args.pick('user')
        })
        let content = await args.pick('string').catch(() => null);
        let reason = await args.repeat('string').catch(() => null);
        let time = content !== null ? durationToMS(content) : null;
        if (time === null) {
            if (content !== null && reason !== null) reason.unshift(content)
        };
        let strReason = reason === null ? 'not given' : reason?.join(' ')
        if (user instanceof discord.GuildMember) {
            if (message.member!.roles.highest.position >= user.roles.highest.position && (message.guild!.ownerId !== message.member!.id)) {
                message.channel.send(`You do not have a high enough role to do this.`);
                return;
            } 
            if (!user.bannable) {
                return message.channel.send("This user is not bannable by the bot.");
            }
            await db.query(`INSERT INTO punishments (member, guild, type, reason, created_time, duration) VALUES ($1, $2, $3, $4, $5, $6) `,
                [user.id, message.guild!.id, 'blist', strReason, new Date(), time]);
            message.guild!.bans.create(user, { reason: strReason, days: 0 });
            message.channel.send(`${user.user.username} has been added to the blacklist and banned${(time === null) ? '.' : `for ${content}`}\n Provided reason: ${strReason}`);
        } else {
            await db.query(`INSERT INTO punishments (member, guild, type, reason, created_time, duration) VALUES ($1, $2, $3, $4, $5, $6) `,
                [user.id, message.guild!.id, 'blist', strReason, new Date(), time]);
            message.channel.send(`${user.username} has been added to the blacklist and banned${(time === null) ? '.' : `for ${content}`}\n Provided reason: ${strReason}`);
        };
        return;
    }

    public async remove(message: discord.Message, args: sapphire.Args) {
        let user = await args.pick('user')
        let q = await db.query('SELECT * FROM punishments WHERE type=\'blist\' AND userid = $2 AND guild = $1', [user.id, message.guild!.id]);
        if (q.rowCount === 0) return;
        await message.guild!.members.unban(user).catch(() => { })
        db.query('UPDATE punishments SET resolved = true WHERE type=\'blist\' AND userid = $2 AND guild = $1', [user.id, message.guild!.id]);
        message.channel.send(`${user.username} has been removed from the blacklist`);
    }

    public async list(message: discord.Message) {
        let smite = await db.query(`SELECT * FROM punishments WHERE type='blist' AND guild = $1 AND NOT RESOLVED`, [message.guild!.id]);
        if (smite.rowCount === 0) message.channel.send(`No users are blacklisted`);
        smite.rows.forEach((i) => {
            message.channel.send(`${i.userid} is blacklisted`);
        });
    }

    public async reset(message: discord.Message) {
        let banned = await db.query(`SELECT * FROM punishments WHERE type='blist' AND guild = $1 AND NOT RESOLVED`, [message.guild!.id]);
        await db.query('UPDATE punishments SET resolved = true WHERE type=\'blist\' AND guild = $1', [message.guild!.id]);
        message.channel.send(`The blacklist has been cleared`);
        banned.rows.forEach((i) => {
            message.guild!.members.unban(i.userid).catch((err) => {
                console.log(err)
            })
        });
    }
}

export class queryCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'query',
            description: 'Runs SQL input against database',
            requiredClientPermissions: [],
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message) {
        let str = message.content;
        let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
        if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
            message.channel.send('You do not have permission to do this');
            return;
        }
        console.log(out);
        let data = await db.query(out);
        console.log('done');
        let JSONdata = JSON.stringify(data.rows, null, 1);
        if (JSONdata?.length && JSONdata.length < 2000) {
            message.channel.send(`${data.command} completed - ${data.rowCount} rows, \n${JSONdata}`);
            return;
        } else if (JSONdata?.length && JSONdata.length > 2000) {
            const buffer = Buffer.from(JSONdata)
            const attachment = new discord.MessageAttachment(buffer, 'file.json');
            message.channel.send(`${data.command} completed - ${data.rowCount} rows,`);
            message.channel.send({ files: [attachment] });
        } else {
            message.channel.send(`${data.command} completed - ${data.rowCount} rows,`);
        }

    };

};

export class prefixCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'prefix',
            description: 'Shows prefix',
            requiredClientPermissions: [],
            preconditions: ['GuildOnly', permissionsPrecondition('ADMINISTRATOR')]
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let x = args.next()
        guildDataCache.change(message.guild!.id, 'prefix', x);
        message.channel.send(`Changed prefix for ${message.guild!.name} to ${x}`);
    }
}

export class sirmoleCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'sirmole',
            description: 'unfunny',
            requiredClientPermissions: [],
            preconditions: []
        });
    };
    public async messageRun(message: discord.Message) {
        message.channel.send('sir mole is unfunny')
    }
}

