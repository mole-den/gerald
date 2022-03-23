import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';
import { SubCommandPluginCommand, SubCommandPluginCommandOptions } from '@sapphire/plugin-subcommands';
import { PaginatedMessageEmbedFields } from '@sapphire/discord.js-utilities';
import { durationToMS, prisma, getRandomArbitrary, bot, cleanMentions } from '../index';
import { ApplyOptions } from '@sapphire/decorators';
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
        type attachment = Array<{
            url: string,
            name: string | null
        }>;
        let amount: number;
        let arg = await args.pick('number');
        if (isNaN(arg)) return message.channel.send('Please specify a valid amount of messages to view.');
        amount = (arg <= 10) ? arg : (() => {
            throw new sapphire.UserError({ identifier: 'amount>10', message: 'Amount must be less than 10.' });
        })();
        amount = (arg >= 0) ? arg : (() => {
            throw new sapphire.UserError({ identifier: 'amount<=0', message: 'Amount must be greater than 0.' });
        })();
        let del = await prisma.deleted_msg.findMany({
            where: {
                guildId: message.guildId!
            },
            orderBy: {
                msgTime: "desc"
            },
            take: amount
        })
        let embeds: Array<discord.MessageEmbed> = [];
        del.forEach(async (msg) => {
            let attachments = <attachment>msg.attachments
            if (msg.content.length > 1028) {
                var content: string = msg.content.substring(0, 1025) + '...';
            } else {
                var content: string = msg.content;
            }
            const DeleteEmbed = new discord.MessageEmbed()
                .setTitle("Deleted Message")
                .setColor("#fc3c3c")
                .addField("Author", `<@${msg.author}>`, true)
                .addField("Deleted By", msg.deletedBy, true)
                .addField("Channel", `<#${msg.channel}>`, true)
                .addField("Message", content || "None");
            DeleteEmbed.footer = {
                text: `ID: ${msg.id} | Message ID: ${msg.msgId}\nAuthor ID: ${msg.author}`
            };
            if (attachments.length > 0) {
                let attachArray: string[] = [];
                (attachments).forEach((attach) => {
                    attachArray.push(attach.name ? `[${attach.name}](${attach.url})` : `${attach.url}`);
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

@ApplyOptions<sapphire.CommandOptions>({
    name: 'timeout',
    aliases: ['tm'],
    requiredClientPermissions: "MODERATE_MEMBERS",
    requiredUserPermissions: "MODERATE_MEMBERS",
    preconditions: ["GuildOnly"],
    description: 'Time out a user',
})
export class timeoutCommand extends sapphire.Command {
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        try {
            var user = await args.pick('member');
        } catch {
            throw new sapphire.UserError({
                identifier: 'invalidargs',
                message: "Provide a valid user to time out."
            })

        }
        let rest = await args.repeatResult('string')
        if (user.isCommunicationDisabled()) {
            throw new sapphire.UserError({
                identifier: 'invalidargs',
                message: "This user is aleady timed out."
            })

        }
        if (message.member!.roles.highest.comparePositionTo(user.roles.highest) < 0 === true) {
            throw new sapphire.UserError({
                identifier: 'invalidperms',
                message: "You do not have permission to do that."
            })
        } else if (user.permissions.has('ADMINISTRATOR')) {
            throw new sapphire.UserError({
                identifier: 'ineffectivetimeout',
                message: 'This user has permissions that make the time out ineffective.'
            })
        }
        if (rest.success === false) {
            throw new sapphire.UserError({
                identifier: 'missingargs',
                message: "Provide a duration for the time out."
            })
        }
        const timeoutDuration = durationToMS(rest.value!.join(' '))
        if (timeoutDuration === null || Number.isNaN(timeoutDuration), timeoutDuration <= 0 || timeoutDuration > time.Time.Month) {
            throw new sapphire.UserError({
                identifier: 'invalidargs',
                message: "Provide a valid time out duration. (max 1 month)"
            })
        }
        user.timeout(timeoutDuration)
        let formatter = new time.DurationFormatter()
        message.channel.send(`Timed out **${user.user.tag}** for ${formatter.format(timeoutDuration - 1000)}`)
    }
}

@ApplyOptions<sapphire.CommandOptions>({
    name: 'cleartimeout',
    aliases: ['ctm'],
    requiredClientPermissions: "MODERATE_MEMBERS",
    requiredUserPermissions: "MODERATE_MEMBERS",
    preconditions: ["GuildOnly"],
    description: 'Remove time out from a user',
})
export class rmTimeoutCommand extends sapphire.Command {
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        const users = await args.repeatResult('member');
        if (users.success) {
            users.value!.forEach((u) => {
                u.timeout(null)
            });
            let u = users.value.map(u => `**${u.user.tag}**`)
            message.channel.send(`Removed time out from ${u.length === 1 ? u[0] : u.join(', ')}`)
        } else {
            throw new sapphire.UserError({
                identifier: 'invalidargs',
                message: "Provide a valid user."
            })
        }
    }
}

@ApplyOptions<SubCommandPluginCommandOptions>({
    name: 'ban',
    aliases: ['smite'],
    description: 'Allows management and creation of bans',
    requiredClientPermissions: ['BAN_MEMBERS'],
    requiredUserPermissions: ['BAN_MEMBERS'],
    preconditions: ['GuildOnly'],
    subCommands: ['add', 'remove', { input: 'add', default: true }]
})
export class banCommand extends SubCommandPluginCommand {
    public async add(message: discord.Message, args: sapphire.Args) {
        const bans = await message.guild!.bans.fetch()
        let user = await args.pick('member').catch(() => {
            return args.pick('user')
        })
        if (bans.find(v => v.user.id === user.id) !== undefined) return message.channel.send(`This user is already banned`)

        let reason = ((await args.repeat('string').catch(() => null))?.join(" ") || "none")
        if (user instanceof discord.GuildMember) {
            if (message.member!.roles.highest.comparePositionTo(user.roles.highest) <= 0 && (message.guild!.ownerId !== message.member!.id)) {
                message.channel.send(`You do not have a high enough role to do this.`);
                return;
            }
            if (!user.bannable) {
                return message.channel.send("This user is not bannable by the bot.");
            };
            message.guild!.bans.create(user, { reason: `Banned by ${message.author.tag} with reason "${reason}"`, days: 0 });
            message.channel.send({
                content: `**${user.user.tag}** has been banned.`,
            });
        } else {
            message.guild!.bans.create(user, { reason: `Banned by ${message.author.tag} with reason ${reason}`, days: 0 })
            message.channel.send({
                content: `**${user.tag}** has been banned.`,
            });
        };
        return;
    }

    public async remove(message: discord.Message, args: sapphire.Args) {
        let user = await args.pick('user');
        const bans = await message.guild!.bans.fetch()
        if (bans.find(v => v.user.id === user.id) === undefined) return message.channel.send('This user is not banned');
        message.guild!.members.unban(user).catch(() => { })
        return message.channel.send(`**${user.tag}** has been unbanned`);
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
        let data = await prisma.$queryRawUnsafe(out);
        let JSONdata = JSON.stringify(data, null, 1);
        if (JSONdata?.length && JSONdata.length < 2000) {
            message.channel.send(`${cleanMentions(JSONdata)}`);
            return;
        } else if (JSONdata?.length && JSONdata.length > 2000) {
            const buffer = Buffer.from(JSONdata)
            const attachment = new discord.MessageAttachment(buffer, 'file.json');
            message.channel.send({ files: [attachment] });
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
    public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
        reg.registerChatInputCommand((builder) => {
            return builder.setName(this.name)
                .setDescription(this.description)
                .addStringOption(i => i.setName('prefix')
                    .setDescription('New bot prefix.').setAutocomplete(false).setRequired(false))
        }, {
            idHints: ["955744435654787082"]
        })
    }
    public override async chatInputRun(interaction: sapphire.ChatInputCommand.Interaction) {
        let x = interaction.options.get("prefix")
        this.baseRun((x?.value as string) ?? null, interaction)
    }
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let x = args.nextMaybe()
        this.baseRun(x.value ?? null, message)
    }
    private async baseRun(x: string | null, item: discord.Message | discord.CommandInteraction) {
        function send(msg: string) {
            if (item instanceof discord.Message) {
                item.channel.send(msg)
            } else {
                item.reply({
                    content: msg
                })
            }
        }
        if (!x) {
            let prefix = await prisma.guild.findUnique({
                where: {
                    guildId: item.guild!.id
                },
                select: { prefix: true }
            })
            send(`The prefix for this server is \`${prefix!.prefix}\``);
            return
        }
        if (item instanceof discord.CommandInteraction) {
            if (!item.memberPermissions) return send("Failed to resolve user permissions.")
            if (!item.memberPermissions.has("ADMINISTRATOR"))
                return send(`You are missing the following permissions to run this command: Administrator`);
        } else {
            if (!item.member!.permissions.has("ADMINISTRATOR"))
                return send(`You are missing the following permissions to run this command: Administrator`);
        }
        prisma.guild.update({
            where: {
                guildId: item.guildId!
            },
            data: {
                prefix: x
            }
        })
        return send(`Changed prefix for ${item.guild!.name} to \`${x}\``);

    }
}

@ApplyOptions<sapphire.CommandOptions>({
    name: 'invite',
    description: 'Shows invite link'
})
export class inviteCommand extends sapphire.Command {
    public async messageRun(message: discord.Message) {
        message.channel.send(`Invite is: https://discord.com/oauth2/authorize?client_id=671156130483011605&permissions=8&scope=bot%20applications.commands`)
    }
}
@ApplyOptions<sapphire.CommandOptions>({
    name: 'info',
    description: 'Shows general information about the bot',
})
export class infoCommand extends sapphire.Command {
    public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
        reg.registerChatInputCommand((builder) => {
            return builder.setName(this.name)
                .setDescription(this.description);
        })
    }
    public override async messageRun(message: discord.Message) {
        message.channel.send({
            embeds: [await this.execute()]
        });
    }
    public override async chatInputRun(interaction: sapphire.ChatInputCommand.Interaction) {
        return interaction.reply({
            embeds: [await this.execute()]
        })
    }
    private async execute() {
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
        let start = Date.now();
        await prisma.$queryRawUnsafe('SELECT 1;');
        let elapsed = Date.now() - start;
        let embed = new discord.MessageEmbed().setColor('BLURPLE').setFooter({ text: `Gerald v${require('../../package.json').version}` });
        embed.setTitle('Info')
            .addField('Github repo', 'https://github.com/mole-den/Gerald')
            .addField('Uptime', uptimeString)
            .addField('Discord API heartbeat', `${bot.ws.ping}ms`, false)
            .addField('Database Heartbeat', `${elapsed}ms`, false)
            .addField(`Memory usage`, `${Math.round(process.memoryUsage.rss() / 1000000)}MB `);
        return embed
    }
}

@ApplyOptions<sapphire.CommandOptions>({
    name: 'help',
    description: 'Shows infomation about commands'
}) export class helpCommand extends sapphire.Command {
    public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
        reg.registerChatInputCommand((builder) => {
            return builder.setName(this.name)
                .setDescription(this.description)
                .addStringOption(i => i.setName('command')
                    .setDescription('The command to get help for').setAutocomplete(false).setRequired(false))
        })
    }
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let maybe = args.nextMaybe();
        if (!maybe.exists) return this.baseHelp(message);
        let command = maybe.value!;
        let cmd = bot.stores.get('commands').find(cmd => (cmd.name === command || cmd.aliases.includes(command)) && !cmd.fullCategory.includes("_hidden"));
        if (!cmd) return message.channel.send(`Command \`${command}\` not found`);
        return message.channel.send({ embeds: [this.cmdHelp(cmd)] });
    };

    public async chatInputRun(interaction: sapphire.ChatInputCommand.Interaction) {
        let x = interaction.options.get('command')
        if (x === null || x.value === undefined) return this.baseHelp(interaction);
        let cmd = bot.stores.get('commands').find(cmd => cmd.name === x!.value);
        if (cmd === null) return interaction.reply({
            content: 'Specify a valid command.',
            ephemeral: true
        })
        interaction.reply({ embeds: [this.cmdHelp(cmd!)] })
    }
    private cmdHelp(cmd: sapphire.Command) {
        let embed = new discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Help for **${cmd.name}**`);
        if (cmd.aliases.length > 0)
            embed.addField('Command aliases:', cmd.aliases.join(', '), false);
        else
            embed.addField('Command aliases:', 'None', false);
        if (cmd.description)
            embed.addField('Description:', cmd.description, false);
        else
            embed.addField('Description:', 'null', false);
        if (cmd.detailedDescription) {
            if (typeof cmd.detailedDescription === 'string')
                embed.addField('Usage:', (cmd.detailedDescription), false);
            else {
                Object.keys(cmd.detailedDescription).forEach(c => {
                    //@ts-expect-error
                    embed.addField(`${c}:`, cmd?.detailedDescription[c]);
                });
            }
        }
        else
            embed.addField('Usage:', 'null', false);
        return embed
    }

    private baseHelp(message: discord.Message | sapphire.ChatInputCommand.Interaction) {
        let items: Array<discord.EmbedFieldData> = bot.stores.get('commands').filter(cmd => cmd.fullCategory.includes('_hidden') === false).map((x) => {
            let aliases = x.aliases.length > 0 ? `(aliases: ${x.aliases.join(', ')})` : '';
            return {
                name: `${x.name} ${aliases}`,
                value: x.description,
                inline: false
            };
        });
        let response = new PaginatedMessageEmbedFields();
        response.setTemplate({ title: 'Help', color: '#0099ff', footer: { text: `Use \`help <command>\` to get more information on a command\nGerald v${require('../../package.json').version!}` } })
            .setItems(items)
            .setItemsPerPage(5)
            .make()
            .run(message);
        return;
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
            let i = await message.guild?.roles.fetch("915746575689588827")
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


@ApplyOptions<sapphire.CommandOptions>({
    name: 'commands',
    aliases: ['cmds'],
    fullCategory: ['_enabled'],
    description: 'Allows management of commands and other bot features',
    requiredUserPermissions: 'ADMINISTRATOR',
    preconditions: ['GuildOnly'],

})
export class commandsManagerCommand extends sapphire.Command {
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        const subcmd = await args.peek('string');
        if (!(subcmd in ['disable', 'enable', 'status'])) return message.channel.send({
            content: ""
        })
        if (subcmd == "disable") return this.disable(message, args)
        if (subcmd == "enable") return this.enable(message, args)
        // if (subcmd == "status") return this.status(message, args)
        return
    }
    private async disable(message: discord.Message, args: sapphire.Args) {
        let cmd = args.nextMaybe()
        if (cmd.exists === false) {
            throw new sapphire.UserError({ identifier: 'invalidsyntax', message: 'Specify a command to disable' });
        }
        let command = this.container.stores.get('commands').find(value => value.name === cmd.value)
        if (!command || command.fullCategory.includes('_hidden')) return message.channel.send('Command not found');
        if (command.fullCategory.some(x => x === '_enabled')) {
            message.channel.send(`This command cannot be disabled.`)
            return;
        }
        let i = ((await prisma.guild.findUnique({ where: { guildId: message.guildId! } }))!.disabled!);
        i.some(x => x === cmd.value!) ? (() => {
            throw new sapphire.UserError({ identifier: 'invalid', message: 'Command already disabled' })
        }) : i.push(cmd.value!);
        prisma.guild.update({
            where: { guildId: message.guildId! },
            data: { disabled: i }
        })
        return message.channel.send(`Disabled command **${cmd.value!}**`)
    }

    private async enable(message: discord.Message, args: sapphire.Args) {
        let cmd = args.nextMaybe()
        if (cmd.exists === false) throw new sapphire.UserError({ identifier: 'invalidsyntax', message: 'Specify a command to enable' });
        let command = this.container.stores.get('commands').find(value => value.name === cmd.value);
        if (!command) return message.channel.send('Command not found');
        let i = (await prisma.guild.findUnique({ where: { guildId: message.guildId! } }))!.disabled!;
        prisma.guild.update({
            where: { guildId: message.guildId! },
            data: { disabled: i.filter(x => x !== cmd.value) }
        })
        return message.channel.send(`Enabled command **${cmd.value!}**`)
    }
}

@ApplyOptions<sapphire.CommandOptions>({
    name: 'level',
    description: 'Shows the level of a user.',
    preconditions: ["GuildOnly"]

}) export class viewLevelCommand extends sapphire.Command {
    public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
        reg.registerChatInputCommand((builder) => {
            return builder.setName(this.name)
                .setDescription(this.description)
                .addUserOption(i => i.setName('user')
                    .setDescription('Get a specific members level.').setRequired(false))
        })
    }
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        const user = await args.pick("member")
        let x = (await prisma.member_level.findMany({
            where: {
                memberID: user.id,
                guildID: message.guildId!
            }
        }))[0]
        message.channel.send(`${user.user.username} is level ${x.level} and has ${x.xp} xp.`)
    }

    public async chatInputRun(interaction: discord.CommandInteraction) {
        let user = interaction.options.getUser("user") ?? interaction.user
        let x = (await prisma.member_level.findMany({
            where: {
                memberID: user.id!,
                guildID: interaction.guildId!
            }
        }))[0]
        interaction.reply(`${user.username} is level ${x.level} and has ${x.xp} xp.`)
    }
}