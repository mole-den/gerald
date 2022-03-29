import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';
import _ from "lodash"
import { PaginatedMessageEmbedFields } from '@sapphire/discord.js-utilities';
import { durationToMS, prisma, getRandomArbitrary, bot, cleanMentions } from '../index';
import { GeraldCommand, geraldCommandOptions, Module } from '../commandClass';
import { ApplyOptions } from '@sapphire/decorators';
import * as time from '@sapphire/time-utilities';
import axios from 'axios';
import { utils } from '../utils';
axios.defaults.validateStatus = () => true
///<reference types="../index"/>
time;

@ApplyOptions<geraldCommandOptions>({
    name: 'eval',
    alwaysEnabled: true,
    ownerOnly: true,
    hidden: true,
    description: 'Evaluates JS input',
    requiredClientPermissions: [],
    preconditions: ['OwnerOnly']
})
export class ownerEvalCommand extends GeraldCommand {
    public async chatRun(message: discord.Message) {
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

@ApplyOptions<geraldCommandOptions>({
    name: 'deleted',
    description: 'Shows infomation about the last deleted messages',
    requiredClientPermissions: [],
    requiredUserPermissions: 'MANAGE_MESSAGES',
    preconditions: ['GuildOnly'],
    options: ['id']
})
export class DeletedMSGCommand extends GeraldCommand {
    public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
        reg.registerChatInputCommand((builder) => {
            return builder.setName(this.name)
                .setDescription(this.description).addIntegerOption(i => i.setName('amount')
                    .setDescription("Amount of messages to get").setMinValue(1).setMaxValue(5).setRequired(true))
        }, {
            behaviorWhenNotIdentical: sapphire.RegisterBehavior.Overwrite
        })
    }

    public async chatRun(message: discord.Message, args: sapphire.Args) {
        let amount: number;
        let arg = await args.pick('number');
        if (isNaN(arg)) return message.channel.send('Please specify a valid amount of messages to view.');
        amount = (arg <= 10) ? arg : (() => {
            throw new sapphire.UserError({ identifier: 'amount>10', message: 'Amount must be less than 10.' });
        })();
        amount = (arg >= 0) ? arg : (() => {
            throw new sapphire.UserError({ identifier: 'amount<=0', message: 'Amount must be greater than 0.' });
        })();
        let x = await this.mainRun(message.guildId!, amount)
        message.channel.send({
            embeds: x
        })
        return
    }
    public async slashRun(interaction: discord.CommandInteraction) {
        let x = await this.mainRun(interaction.guildId!, interaction.options.getInteger('amount')!)
        interaction.editReply({
            embeds: x
        })
    }
    private async mainRun(guild: string, amount: number): Promise<discord.MessageEmbed[]> {
        type attachment = Array<{
            url: string,
            name: string | null
        }>;
        let del = await prisma.deleted_msg.findMany({
            where: {
                guildId: guild
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
        return embeds;
    };

};

@ApplyOptions<geraldCommandOptions>({
    name: 'timeout',
    aliases: ['tm'],
    requiredClientPermissions: "MODERATE_MEMBERS",
    requiredUserPermissions: "MODERATE_MEMBERS",
    preconditions: ["GuildOnly"],
    description: 'Time out a user',
})
export class timeoutCommand extends GeraldCommand {
    public async chatRun(message: discord.Message, args: sapphire.Args) {
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

@ApplyOptions<geraldCommandOptions>({
    name: 'cleartimeout',
    aliases: ['ctm'],
    requiredClientPermissions: "MODERATE_MEMBERS",
    requiredUserPermissions: "MODERATE_MEMBERS",
    preconditions: ["GuildOnly"],
    description: 'Remove time out from a user',
})
export class rmTimeoutCommand extends GeraldCommand {
    public async chatRun(message: discord.Message, args: sapphire.Args) {
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


@ApplyOptions<geraldCommandOptions>({
    name: 'query',
    ownerOnly: true,
    alwaysEnabled: true,
    hidden: true,
    description: 'Runs SQL input against database',
    requiredClientPermissions: [],
    preconditions: ['OwnerOnly']
})
export class queryCommand extends GeraldCommand {
    public async chatRun(message: discord.Message) {
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

@ApplyOptions<geraldCommandOptions>({
    name: 'prefix',
    fullCategory: ['_enabled'],
    description: 'Shows and allows configuration of the bot prefix',
    requiredClientPermissions: [],
    requiredUserPermissions: [],
    preconditions: ['GuildOnly']
})
export class prefixCommand extends GeraldCommand {
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
    public override async slashRun(interaction: sapphire.ChatInputCommand.Interaction) {
        let x = interaction.options.get("prefix")
        this.baseRun((x?.value as string) ?? null, interaction)
    }
    public async chatRun(message: discord.Message, args: sapphire.Args) {
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

@ApplyOptions<geraldCommandOptions>({
    name: 'invite',
    description: 'Shows invite link'
})
export class inviteCommand extends GeraldCommand {
    public async chatRun(message: discord.Message) {
        message.channel.send(`Invite is: https://discord.com/oauth2/authorize?client_id=671156130483011605&permissions=8&scope=bot%20applications.commands`)
    }
}
@ApplyOptions<geraldCommandOptions>({
    name: 'info',
    description: 'Shows general information about the bot',
})
export class infoCommand extends GeraldCommand {
    public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
        reg.registerChatInputCommand((builder) => {
            return builder.setName(this.name)
                .setDescription(this.description);
        })
    }
    public override async chatRun(message: discord.Message) {
        message.channel.send({
            embeds: [await this.execute()]
        });
    }
    public override async slashRun(interaction: sapphire.ChatInputCommand.Interaction) {
        return interaction.editReply({
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

@ApplyOptions<geraldCommandOptions>({
    name: 'help',
    description: 'Shows infomation about commands'
}) export class helpCommand extends GeraldCommand {
    public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
        reg.registerChatInputCommand((builder) => {
            return builder.setName(this.name)
                .setDescription(this.description)
                .addStringOption(i => i.setName('command')
                    .setDescription('The command to get help for').setAutocomplete(false).setRequired(false))
        })
    }
    public async chatRun(message: discord.Message, args: sapphire.Args) {
        let maybe = args.nextMaybe();
        if (!maybe.exists) return this.baseHelp(message);
        let command = maybe.value!;
        let cmd = bot.stores.get('commands').find(cmd => (cmd.name === command || cmd.aliases.includes(command)) && !cmd.fullCategory.includes("_hidden"));
        if (!cmd) return message.channel.send(`Command \`${command}\` not found`);
        return message.channel.send({ embeds: [this.cmdHelp(cmd)] });
    };

    public async slashRun(interaction: sapphire.ChatInputCommand.Interaction) {
        let x = interaction.options.get('command')
        if (x === null || x.value === undefined) return this.baseHelp(interaction);
        let cmd = bot.stores.get('commands').find(cmd => cmd.name === x!.value);
        if (cmd === null) return interaction.followUp({
            content: 'Specify a valid command.',
            ephemeral: true
        })
        interaction.editReply({ embeds: [this.cmdHelp(cmd!)] })
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

@ApplyOptions<geraldCommandOptions>({
    name: 'ask',
    description: 'Ask a question and get a response',
    options: ['user']
}) export class askCommand extends GeraldCommand {
    public async chatRun(message: discord.Message, args: sapphire.Args) {
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

@ApplyOptions<geraldCommandOptions>({
    name: 'level',
    description: 'Shows the level of a user.',
    preconditions: ["GuildOnly"]

}) export class viewLevelCommand extends GeraldCommand {
    public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
        reg.registerChatInputCommand((builder) => {
            return builder.setName(this.name)
                .setDescription(this.description)
                .addUserOption(i => i.setName('user')
                    .setDescription('Get a specific members level.').setRequired(false))
        })
    }
    public async chatRun(message: discord.Message, args: sapphire.Args) {
        let user = await args.pick("member").catch(() => {
            return message.member!
        })
        let x = (await prisma.member_level.findUnique({
            where: {
                memberID_guildID: {
                    memberID: user.id,
                    guildID: message.guildId!
                }
            }
        }))
        if (x === null) x = await prisma.member_level.create({
            data: {
                memberID: user.id,
                guildID: message.guildId!,
            }
        })
        message.channel.send(`${user.user.username} is level ${x.level} and has ${x.xp} xp.`)
    }

    public async slashRun(interaction: discord.CommandInteraction) {
        let user = interaction.options.getUser("user") ?? interaction.user
        let x = (await prisma.member_level.findUnique({
            where: {
                memberID_guildID: {
                    memberID: user.id,
                    guildID: interaction.guildId!
                }
            }
        }))
        if (x === null) x = await prisma.member_level.create({
            data: {
                memberID: user.id,
                guildID: interaction.guildId!,
            }
        })

        interaction.editReply(`${user.username} is level ${x.level} and has ${x.xp} xp.`)
    }
}

@ApplyOptions<geraldCommandOptions>({
    name: 'warframe',
    description: 'Command to access warframe APIs.'
}) export class warframeCommand extends GeraldCommand {
    public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
        reg.registerChatInputCommand((builder) => {
            return builder.setName(this.name)
                .setDescription(this.description)
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('market')
                        .setDescription('Access the warframe.market API')
                        .addStringOption(option => option.setName('item').setDescription('The item to get information about').setRequired(true))
                        .addStringOption(option => option.addChoices([["xbox", "xbox"], ["pc", "pc"], ["ps4", "ps4"], ["switch", "switch"]])
                            .setRequired(false).setDescription("Return data for specified platform. Default: pc").setName("platform")))

        }, {
            idHints: ["957171251271585822"],
            behaviorWhenNotIdentical: sapphire.RegisterBehavior.Overwrite
        })
    }
    public async slashRun(interaction: discord.CommandInteraction) {
        let item = interaction.options.getString("item")!
        item = item.replace(/([^a-z])/gmi, "_").toLowerCase()
        let data = await axios.get(`https://api.warframe.market/v1/items/${item}/orders?include=item`, {
            responseType: "json",
            headers: {
                "Platform": (interaction.options.getString("platform") ?? 'pc')
            }
        })
        if (data.status === 404) {
            interaction.editReply(`404: Item \`${item}\` not found.`)
            return
        }
        if (data.status !== 200) {
            interaction.editReply(`${data.status}: ${data.statusText}`)
            return
        }
        interface order {
            quantity: number,
            platinum: number,
            order_type: "sell" | "buy",
            user: {
                reputation: number,
                region: string,
                last_seen: string,
                ingame_name: string,
                id: string,
                avatar: null | string,
                status: string
            },
            platform: string,
            region: string,
            creation_date: string,
            last_update: string,
            visible: boolean,
            id: string
        }
        let orders: order[] = data.data.payload.orders
        orders = orders.filter(v => {
            return v.order_type === "sell" && v.quantity === 1
        })
        let prices: number[] = []
        orders.forEach(x => {
            prices.push(x.platinum)
        });
        let mean = Math.round(_.mean(prices))
        const min = Math.min(...prices)
        const max = Math.max(...prices)
        const totalOrders = orders.length
        const row = new discord.MessageActionRow()
            .addComponents(
                new discord.MessageButton()
                    .setLabel('Market listing')
                    .setURL(`https://warframe.market/items/${item}`)
                    .setStyle("LINK"),
            ).addComponents(utils.dismissButton)
        let embed = new discord.MessageEmbed()
            .setTitle(`Market information for ${interaction.options.getString("item")!} on ${(interaction.options.getString("platform") ?? 'pc')}`)
            .setColor("BLURPLE")
            .setTimestamp(new Date())
            .addField("Price information", `Highest price: ${max}p\nLowest price: ${min}p\nMean price: ${mean}p\nTotal sell orders: ${totalOrders}`)
        await interaction.editReply({
            embeds: [embed],
            components: [row]
        })
        let response = await interaction.fetchReply()
        if (response instanceof discord.Message)
            utils.handleDismissButton(interaction, response)
    }
}
@ApplyOptions<geraldCommandOptions>({
    name: 'settings',
    description: 'Manage bot settings',
    preconditions: ["GuildOnly"]
})
export class SettingsCommand extends GeraldCommand {
    public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
        reg.registerChatInputCommand((builder) => {
            return builder.setName(this.name)
                .setDescription(this.description)
        }, {
            behaviorWhenNotIdentical: sapphire.RegisterBehavior.Overwrite
        })
    }

    public async slashRun(interaction: discord.CommandInteraction, reply: discord.Message) {
        let commands = bot.stores.get("commands").filter((i) => {
            let a = <GeraldCommand>i
            return a.settings !== null
        })
        let modules = sapphire.container.modules.filter(i => i.settings !== null)
        let all = <Array<GeraldCommand | Module>>[...modules, ...commands]
        all;
        let x = all.map(i => {
            return {
                name: i.name,
                value: i.description
            }
        })
        let a = new discord.MessageEmbed()
            .setTitle("Settings").setColor("GREEN").addFields(x)
        let row = new discord.MessageActionRow().addComponents(
            new discord.MessageButton().setCustomId("category").setLabel("Select Category").setStyle("PRIMARY"), utils.dismissButton)

        await interaction.editReply({
            embeds: [a],
            components: [row]
        })
        let value = await utils.buttonListener<discord.SelectMenuInteraction>({
            interaction: interaction,
            response: reply,
            async onClick(button, next) {
                await button.reply({
                    content: "Select a settings category.",
                    ephemeral: true,
                    components: [new discord.MessageActionRow()
                        .addComponents(
                            new discord.MessageSelectMenu()
                                .setCustomId('select_category')
                                .setPlaceholder('Nothing selected')
                                .addOptions(x.map(i => {
                                    return {
                                        label: i.name,
                                        value: i.name,
                                        description: i.value
                                    }
                                })),
                        )]
                });
                let categoryRequest = await button.fetchReply()
                let category = await utils.awaitSelectMenu(interaction, <discord.Message>categoryRequest)
                if (category) {
                    next(category)
                }

            },
            onEnd() {
                utils.disableButtons(reply)
            }
        })
        await value?.deferUpdate()
        if (value?.message instanceof discord.Message) await value.message.delete()
        let selected = all.find(i => i.name === value?.values[0])
        if (selected) {
            selected.settingsHandler(interaction)
        }
    }
}