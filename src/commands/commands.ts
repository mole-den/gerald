import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';
import { SubCommandPluginCommand, SubCommandPluginCommandOptions } from '@sapphire/plugin-subcommands';
import { PaginatedMessageEmbedFields } from '@sapphire/discord.js-utilities';
import { durationToMS, db, getRandomArbitrary, bot, cleanMentions, memberCache, durationStringCreator, taskScheduler } from '../index';
import { ApplyOptions } from '@sapphire/decorators';
import * as lux from 'luxon';
import * as time from '@sapphire/time-utilities';
///<reference types="../index"/>
time;

@ApplyOptions<sapphire.CommandOptions>({
    name: 'eval',
    fullCategory: ['_enabled', '_owner', '_hidden'],
    description: 'Evaluates JS input',
    requiredClientPermissions: [],
    preconditions: ['OwnerOnly']
})
export class ownerEvalCommand extends sapphire.Command {
    public async messageRun(message: discord.Message) {
        let str = message.content;
        let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
        let container = this.container
        try {
            container;
            eval(`
            (async () => {
                ${out}
            })()`);
        } catch (error) {
            console.log("error");
            console.log(error);
            message.channel.send(`Unhandled exception: \n ${error}`);
        }
    };
};

@ApplyOptions<sapphire.CommandOptions>({
    name: 'deleted',
    description: 'Shows infomation about the last deleted messages',
    requiredClientPermissions: [],
    requiredUserPermissions: 'MANAGE_MESSAGES',
    preconditions: ['GuildOnly'],
    options: ['id']
})
export class DeletedMSGCommand extends sapphire.Command {
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let amount: number | never;
        let arg = await args.pick('number');
        if (isNaN(arg)) return message.channel.send('Please specify a valid amount of messages to view.');
        amount = (arg <= 10) ? arg : (() => {
            throw new sapphire.UserError({ identifier: 'amount>10', message: 'Amount must be less than 10.' });
        })();
        amount = (arg >= 0) ? arg : (() => {
            throw new sapphire.UserError({ identifier: 'amount<=0', message: 'Amount must be greater than 0.' });
        })();
        let del = await db.query('SELECT * FROM deletedmsgs WHERE guildid=$2 ORDER BY msgtime DESC LIMIT $1;',
            [amount, message.guildId]);
        let embeds: Array<discord.MessageEmbed> = [];
        del.rows.forEach(async (msg) => {
            if (msg.content.length > 1028) {
                var content: string = msg.content.substring(0, 1025) + '...';
            } else {
                var content: string = msg.content;
            }
            const DeleteEmbed = new discord.MessageEmbed()
                .setTitle("Deleted Message")
                .setColor("#fc3c3c")
                .addField("Author", `<@${msg.author}>`, true)
                .addField("Deleted By", msg.deleted_by, true)
                .addField("Channel", `<#${msg.channel}>`, true)
                .addField("Message", content || "None");
            DeleteEmbed.footer = {
                text: `ID: ${msg.id} | Message ID: ${msg.msgid}\nAuthor ID: ${msg.author}`
            };
            if (msg.attachments) {
                let attachArray: string[] = [];
                msg.attachments.forEach((attach: any) => {
                    attachArray.push(`[${attach.name}](${attach.url})`);
                });
                DeleteEmbed.addField('Attachments', attachArray.join('\n'));
            }
            embeds.push(DeleteEmbed)
        });
        message.channel.send({
            embeds: embeds
        });
        return;
    };

};

@ApplyOptions<SubCommandPluginCommandOptions>({
    name: 'smite',
    description: 'Allows management and creation of bans',
    requiredClientPermissions: ['BAN_MEMBERS'],
    requiredUserPermissions: ['BAN_MEMBERS'],
    preconditions: ['GuildOnly'],
    subCommands: ['add', 'remove', 'list', 'reset', { input: 'add', default: true }]
})
export class smiteCommand extends SubCommandPluginCommand {
    public async add(message: discord.Message, args: sapphire.Args) {
        let user = await args.pick('member').catch(() => {
            return args.pick('user')
        })
        await memberCache.validate(message.guild!.id, user.id)
        let content = await args.pick('string').catch(() => null);
        let reason = await args.repeat('string').catch(() => null);
        let time = content !== null ? durationToMS(content) : null;
        if (time === null) {
            if (content !== null && reason !== null) reason.unshift(content)
        };
        let strReason = reason === null ? 'not given' : reason?.join(' ');
        let endsDate = (time !== null) ? new Date(Date.now() + time) : null;
        if (user instanceof discord.GuildMember) {
            if (message.member!.roles.highest.comparePositionTo(user.roles.highest) <= 0 && (message.guild!.ownerId !== message.member!.id)) {
                message.channel.send(`You do not have a high enough role to do this.`);
                return;
            }
            if (!user.bannable) {
                return message.channel.send("This user is not bannable by the bot.");
            };
            await db.query(`INSERT INTO punishments (member, guild, type, reason, created_time, ends) VALUES ($1, $2, $3, $4, $5, $6) `,
                [user.id, message.guild!.id, 'blist', strReason, new Date(), endsDate]);
            message.guild!.bans.create(user, { reason: strReason, days: 0 });
            if (endsDate) taskScheduler.newTask({ 'task': 'unban', when: lux.DateTime.fromJSDate(endsDate), context: { 'guild': message.guild!.id, 'user': user.id } });
            message.channel.send(`${user.user.username} has been added to the blacklist and banned ${(time === null) ? '' : durationStringCreator(lux.DateTime.now(), lux.DateTime.fromJSDate(endsDate!))}\nProvided reason: ${strReason}`);
        } else {
            await db.query(`INSERT INTO punishments (member, guild, type, reason, created_time, ends) VALUES ($1, $2, $3, $4, $5, $6) `,
                [user.id, message.guild!.id, 'blist', strReason, new Date(), endsDate]);
            if (endsDate) taskScheduler.newTask({ 'task': 'unban', when: lux.DateTime.fromJSDate(endsDate), context: { 'guild': message.guild!.id, 'user': user.id } });
            message.channel.send(`${user.username} has been added to the blacklist and banned ${(time === null) ? '' : durationStringCreator(lux.DateTime.now(), lux.DateTime.fromJSDate(endsDate!))}\nProvided reason: ${strReason}`);
        };
        return;
    }

    public async remove(message: discord.Message, args: sapphire.Args) {
        let user = await args.pick('user');
        await memberCache.validate(message.guild!.id, user.id)
        let q = await db.query(`SELECT * FROM punishments WHERE type='blist' AND member = $2 AND guild = $1`, [user.id, message.guild!.id]);
        if (q.rowCount === 0) return;
        message.guild!.members.unban(user).catch(() => { })
        db.query('UPDATE punishments SET resolved = true WHERE type=\'blist\' AND member = $2 AND guild = $1', [user.id, message.guild!.id]);
        message.channel.send(`${user.tag} has been removed from the blacklist`);
    }

    public async list(message: discord.Message) {
        let smite = await db.query(`SELECT * FROM punishments WHERE type='blist' AND guild = $1 AND NOT RESOLVED`, [message.guild!.id]);
        if (smite.rowCount === 0) message.channel.send(`No users are blacklisted`);
        smite.rows.forEach(async (i) => {
            let x = await bot.users.fetch(i.member);
            let date = i.ends ? (+new Date(i.ends) - Date.now()) : null;
            let duration = date === null ? 'permanently' : durationStringCreator(lux.DateTime.now(), lux.DateTime.fromJSDate(new Date(i.ends)));
            message.channel.send(`**${x.username}#${x.discriminator}** is blacklisted until *${duration}*. Case ID: ${i.id}`);
        });
    }
    public async reset(message: discord.Message) {
        let banned = await db.query(`SELECT * FROM punishments WHERE type='blist' AND guild = $1 AND NOT RESOLVED`, [message.guild!.id]);
        message.channel.send(`Warning: This will unban all blacklisted users. Are you sure you want to do this?`);
        const filter = (m: discord.Message) => m.author.id === message.author.id
        const collector = message.channel.createMessageCollector({ filter, time: 10000 });
        let confirm = false
        collector.on('collect', async m => {
            if (m.content === 'yes') {
                await db.query('UPDATE punishments SET resolved = true WHERE type=\'blist\' AND guild = $1', [message.guild!.id]);
                banned.rows.forEach((i) => {
                    message.guild!.members.unban(i.userid).catch((err) => {
                        console.log(err)
                    })
                });
                message.channel.send(`Done`)
                confirm = true
                collector.stop();
                return;
            } else if (message.content === 'no') {
                message.channel.send(`Command aborted.`);
                confirm = true
                collector.stop()
                return
            }
        });
        collector.on('end', () => {
            if (confirm === true) return
            message.channel.send(`Command timed out`)
        });

    }
}

@ApplyOptions<sapphire.CommandOptions>({
    name: 'query',
    fullCategory: ['_enabled', '_owner', '_hidden'],
    description: 'Runs SQL input against database',
    requiredClientPermissions: [],
    preconditions: ['OwnerOnly']
})
export class queryCommand extends sapphire.Command {
    public async messageRun(message: discord.Message) {
        let str = message.content;
        let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
        let data = await db.query(out);
        let JSONdata = JSON.stringify(data.rows, null, 1);
        if (JSONdata?.length && JSONdata.length < 2000) {
            message.channel.send(`${data.command} completed - ${data.rowCount} rows, \n${cleanMentions(JSONdata)}`);
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

@ApplyOptions<sapphire.CommandOptions>({
    name: 'prefix',
    fullCategory: ['_enabled'],
    description: 'Shows and allows configuration of the bot prefix',
    requiredClientPermissions: [],
    requiredUserPermissions: [],
    preconditions: ['GuildOnly']
})
export class prefixCommand extends sapphire.Command {
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let x = args.nextMaybe()
        if (!x.exists) {
            let prefix = await db.query('SELECT prefix FROM guilds WHERE guildid = $1', [message.guild!.id])
            message.channel.send(`The prefix for this server is \`${prefix.rows[0].prefix}\``);
            return
        }
        if (message.member?.permissions.has('ADMINISTRATOR') === false) {
            return message.channel.send(`You are missing the following permissions to run this command: Administrator`);
        }
        db.query('UPDATE guilds SET prefix = $2 WHERE guildid = $1', [message.guild!.id, x.value])
        return message.channel.send(`Changed prefix for ${message.guild!.name} to ${x.value}`);
    }
}

@ApplyOptions<sapphire.CommandOptions>({
    name: 'repo',
    description: 'Shows the bot\'s source code',
})
export class repoCommand extends sapphire.Command {
    public async messageRun(message: discord.Message) {
        message.channel.send(`https://github.com/mole-den/Gerald`);
    }
}

@ApplyOptions<sapphire.CommandOptions>({
    name: 'invite',
    description: 'Shows the bot\'s invite link',
})
export class inviteCommand extends sapphire.Command {
    public async messageRun(message: discord.Message) {
        message.channel.send(`Invite is: https://discord.com/oauth2/authorize?client_id=671156130483011605&permissions=8&scope=bot`);
    }
}

@ApplyOptions<sapphire.CommandOptions>({
    name: 'info',
    description: 'Shows general information about the bot',
})
export class infoCommand extends sapphire.Command {
    public async messageRun(message: discord.Message) {
        let uptime = process.uptime();
        let uptimeString = "";
        if (uptime >= 86400) {
            uptimeString += Math.floor(uptime / 86400) + " days ";
            uptime %= 86400;
        }
        if (uptime >= 3600) {
            uptimeString += Math.floor(uptime / 3600) + " hours ";
            uptime %= 3600;
        }
        if (uptime >= 60) {
            uptimeString += Math.floor(uptime / 60) + " minutes ";
            uptime %= 60;
        }
        uptimeString += Math.floor(uptime) + " seconds";
        let start = Date.now()
        await db.query('select 1;')
        let elapsed = Date.now() - start;
        message.channel.send(`**Uptime:** ${uptimeString}\n**Websocket heartbeat:** ${bot.ws.ping}ms\n**Database heartbeat:** ${elapsed}ms`);
    }
}


@ApplyOptions<sapphire.CommandOptions>({
    name: 'help',
    
    description: 'Shows infomation about commands'
}) export class helpCommand extends sapphire.Command {
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let maybe = args.nextMaybe();
        if (!maybe.exists) {
            let items: Array<discord.EmbedFieldData> = bot.stores.get('commands').filter(cmd => cmd.fullCategory.includes('_hidden') === false).map((x) => {
                return {
                    name: x.name,
                    value: x.description,
                    inline: false
                }
            })
            let response = new PaginatedMessageEmbedFields()
            response.setTemplate({ title: 'Help', color: '#0099ff', footer: { text: `Use \`help <command>\` to get more information on a command\nGerald v${require('../../package.json').version!}` } })
                .setItems(items)
                .setItemsPerPage(5)
                .make()
                .run(message)
            return
        }
        let command = maybe.value!;
        let cmd = bot.stores.get('commands').find(cmd => (cmd.name === command || cmd.aliases.includes(command)) && !cmd.fullCategory.includes("_hidden"));
        if (!cmd) return message.channel.send(`Command \`${command}\` not found`);
        let embed = new discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Help for **${cmd.name}**`);
        if (cmd.aliases) embed.addField('Command aliases', cmd.aliases.join(', '), true);
        else embed.addField('Command aliases', 'None', true);
        if (cmd.description) embed.addField('Description', cmd.description, true);
        else embed.addField('Description', 'null', true);
        if (cmd.detailedDescription) embed.addField('Usage', (cmd.detailedDescription), true);
        else embed.addField('Usage', 'null', true);
        return message.channel.send({
            embeds: [embed]
        })
    }
}

@ApplyOptions<sapphire.CommandOptions>({
    name: 'ask',
    description: 'Ask a question and get a response',
    options: ['user']
}) export class askCommand extends sapphire.Command {
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let opt = args.nextMaybe()
        if (opt.exists && opt.value === 'user') {
            let i = await message.guild!.roles.fetch("915746575689588827")
            i ??= await message.guild!.roles.fetch('858473576335540224')
            if (!i) return;
            let member: Array<string> = []
            i.members.each((mem) => member.push(mem.user.username));
            member.push('nobody');
            let uniq = [...new Set(member)];
            let ask = uniq[getRandomArbitrary(0, member.length - 1)]
            return await message.channel.send(`${ask}`);
        }
        else if (opt.exists && opt.value === 'percent') {
            message.channel.send(`${getRandomArbitrary(0, 100)}%`);
            return;
        }
        if (getRandomArbitrary(0, 20) > 9) {
            return message.channel.send('yes');
        } else {
            return message.channel.send('no');
        }

    }
}


@ApplyOptions<SubCommandPluginCommandOptions>({
    name: 'commands',
    aliases: ['cmds', 'command'],
    fullCategory: ['_enabled'],
    description: 'Allows management of commands and other bot features',
    requiredUserPermissions: 'ADMINISTRATOR',
    preconditions: ['GuildOnly'],
    subCommands: ['disable', 'enable', 'status'],

})
export class commandsManagerCommand extends SubCommandPluginCommand {
    public async disable(message: discord.Message, args: sapphire.Args) {
        let cmd = args.nextMaybe()
        if (cmd.exists === false) {
            throw new sapphire.UserError({ identifier: 'invalidsyntax', message: 'Specify a command to disable' });
        }
        let command = this.container.stores.get('commands').find(value => value.name === cmd.value)
        if (!command || command.fullCategory.includes('_hidden')) return message.channel.send('Command not found');
        if (command.fullCategory.some(x => x === '_enabled' )) {
            message.channel.send(`This command cannot be disabled.`)
            return;
        }
        let i = (<string>(await db.query('SELECT disabled FROM guilds WHERE guildid = $1', [message.guild!.id])).rows[0].disabled).split('');
        i.some(x => x === cmd.value!) ? (() => {
            throw new sapphire.UserError({ identifier: 'invalid', message: 'Command already disabled' })
        }) : i.push(cmd.value!);
        db.query('UPDATE guilds SET disabled = $1 WHERE guildid = $2', [i.join(''), message.guild!.id]);
        return message.channel.send(`Disabled command **${cmd.value!}**`)
    }

    public async enable(message: discord.Message, args: sapphire.Args) {
        let cmd = args.nextMaybe()
        if (cmd.exists === false) throw new sapphire.UserError({ identifier: 'invalidsyntax', message: 'Specify a command to enable' });
        let command = this.container.stores.get('commands').find(value => value.name === cmd.value);
        if (!command) return message.channel.send('Command not found');
        let i = (<string>(await db.query('SELECT disabled FROM guilds WHERE guildid = $1', [message.guild!.id])).rows[0].disabled).split(' ');
        db.query('UPDATE guilds SET disabled = $1 WHERE guildid = $2', [i.filter(x => x !== cmd.value).join(' '), message.guild!.id]);
        return message.channel.send(`Enabled command **${cmd.value!}**`)
    }
    public async status(message: discord.Message) {
        message.channel.send(`Not implemented yet`);
    }
}
