import * as sapphire from "@sapphire/framework"
import * as discord from 'discord.js';
import _ from "lodash";
import { bugsnag, prisma } from ".";
import { utils } from "./utils";

type settingTypes = string | number | boolean
declare module '@sapphire/pieces' {
    interface Container {
        modules: Module[];
    }
}

export interface Setting {
    id: string
    name?: string;
    type: "string" | "number" | "bool" | "choice"
    description?: string;
    default: settingTypes;
    choices?: string[] | undefined
}

interface SettingWithData extends Setting {
    value: settingTypes | undefined
}

export interface SettingGet<T extends settingTypes> extends Setting {
    value: T | undefined
}

export interface ModuleOptions {
    name: string,
    description: string,
    settings?: Setting[]
    hidden?: boolean
}
async function settingsRun(interaction: discord.CommandInteraction, settings: SettingWithData[], changeSetting: (guild: string, settings: SettingWithData[], id: string, value: settingTypes) => Promise<void>): Promise<boolean | string> {
    let embed = new discord.MessageEmbed().setColor("GREEN").setTimestamp(new Date()).setTitle("Settings for levelling");
    settings.forEach(x => {
        embed.addField(`${x.name!}`, `${x.description}\n**Current value:** \`${x.value!}\``)
    })
    let row = new discord.MessageActionRow().addComponents(new discord.MessageSelectMenu().setPlaceholder("Select a setting to change").setOptions(settings.map(i => {
        return {
            label: i.name!,
            value: i.id!
        }
    })).setCustomId("settingToEdit"))
    let row2 = new discord.MessageActionRow().addComponents(utils.dismissButton)
    let reply = await interaction.editReply({
        embeds: [embed],
        components: [row, row2]
    })
    if (reply instanceof discord.Message) {
        let x = await utils.selectMenuListener<string[]>({
            user: interaction.user.id,
            response: reply,
            timeout: 20000,
            onEnd() {
                utils.disableButtons(<discord.Message>reply)
            },
            async onClick(menu, next) {
                await menu.deferUpdate()
                next(menu.values)
            }
        })
        if (x === undefined) return false;
        let setting = settings.find(i => i.id === x![0])!
        if (setting?.type === "string") {
            interaction.editReply({
                content: `Enter a string value for \`${setting.name!}\``,
                embeds: [],
                components: []
            })
            let message = await utils.awaitMessageResponse<discord.Message>({
                response: <discord.Message>reply,
                user: interaction.user.id,
                onEnd: () => {
                    utils.disableButtons(<discord.Message>reply)
                },
                onClick: (async (msg, next) => {
                    next(msg)
                })
            })
            if (!message) return "end";
            message.delete()
            await changeSetting(interaction.guildId!, settings, setting.id, message.content)
            return true
        } else if (setting.type === "bool") {
            let boolRow = new discord.MessageActionRow().addComponents(new discord.MessageSelectMenu().setCustomId("newValue").setOptions({
                value: "true",
                label: "true",
            }, {
                label: "false",
                value: "false"
            }))
            interaction.editReply({
                content: `Select a value for \`${setting.name!}\``,
                components: [boolRow],
                embeds: [],
            })
            let i = await utils.selectMenuListener<string>({
                user: interaction.user.id,
                response: reply,
                timeout: 20000,
                onClick: (async (val, next) => {
                    next(val.values[0])
                }),
                onEnd: () => {
                    utils.disableButtons(<discord.Message>reply)
                }
            })
            if (!i) return "end";
            await changeSetting(interaction.guildId!, settings, setting.id, i)
            return true
        } else if (setting.type === "number") {
            interaction.editReply({
                content: `Enter a number value for \`${setting.name!}\``,
                embeds: [],
                components: []
            })
            let message = await utils.awaitMessageResponse<discord.Message>({
                response: <discord.Message>reply,
                user: interaction.user.id,
                onEnd: () => {
                    utils.disableButtons(<discord.Message>reply)
                },
                onClick: (async (msg, next) => {
                    next(msg)
                })
            })
            if (!message) return "end";
            let content = message.content
            message.delete()
            if (isNaN(Number(content)) || !isFinite(Number(content))) return `"${content}" is not a valid number, try again.`
            await changeSetting(interaction.guildId!, settings, setting.id, content)
            return true
        } else if (setting.type === "choice") {
            let selectMenu = new discord.MessageSelectMenu().setCustomId("newValue");
            let options: Array<discord.MessageSelectOptionData> = []
            setting.choices!.forEach(item => {
             options.push({
                 value: item,
                 label: item
             })
            })
            selectMenu.setOptions(options)
            let boolRow = new discord.MessageActionRow().addComponents(selectMenu)
            interaction.editReply({
                content: `Select a value for \`${setting.name!}\``,
                embeds: [],
                components: [boolRow]
            })
            let i = await utils.selectMenuListener<string>({
                user: interaction.user.id,
                response: reply,
                timeout: 20000,
                onClick: (async (val, next) => {
                    next(val.values[0])
                }),
                onEnd: () => {
                    utils.disableButtons(<discord.Message>reply)
                }
            })
            if (!i) return "end"
            await changeSetting(interaction.guildId!, settings, setting.id, i)
            return true
        };
        return true
    }
    return false
}

export abstract class Module {
    description: string;
    name: string;
    hidden: boolean
    settings: Setting[] | null
    constructor(options: ModuleOptions) {
        this.hidden = options.hidden ?? false
        this.description = options.description;
        this.name = options.name
        this.settings = options.settings ?? null
    }

    abstract load(): Promise<void>
    abstract unload(): Promise<void>
    protected async getSetting(guild: string): Promise<SettingWithData[] | null> {
        if (!this.settings) return null
        let x = await prisma.module_settings.findUnique({
            where: {
                guildid_moduleName: {
                    guildid: guild,
                    moduleName: this.name
                }
            }
        })
        if (x === null) {
            let a = await prisma.module_settings.create({
                data: {
                    guildid: guild,
                    moduleName: this.name,
                    settings: JSON.stringify(this.settings.map(i => {
                        return {
                            id: i.id,
                            value: i.default
                        }
                    }))
                }
            })
            let parsed = <Array<{ id: string, value: string }>>JSON.parse(a.settings)
            return this.settings.map(i => {
                return <SettingWithData>{
                    ...i,
                    value: parsed.find(y => y.id === i.id)!.value
                }
            })
        }
        let parsed = <Array<{ id: string, value: string }>>JSON.parse(x.settings)
        return this.settings.map(i => {
            return <SettingWithData>{
                ...i,
                value: parsed.find(y => y.id === i.id)!.value
            }
        })
    }
    protected async changeSetting(guild: string, settings: SettingWithData[], id: string, value: settingTypes) {
        await prisma.module_settings.create({
            data: {
                guildid: guild,
                moduleName: this.name,
                settings: JSON.stringify(settings.map(i => {
                    if (i.id === id) {
                        return <SettingWithData>{
                            ...i,
                            value: value
                        }
                    }
                    return <SettingWithData>{
                        ...i,
                        value: i.value
                    }
                }))
            }
        })
    }
    public async settingsHandler(interaction: discord.CommandInteraction) {
        if (!this.settings) return
        while (true) {
            let i = await settingsRun(interaction, (await this.getSetting(interaction.guildId!)!)!, this.changeSetting)
            if (i === false) break;
            else if (i === true) {}
            else if (typeof i === "string" && i === "end") {}
            else if (typeof i === "string") interaction.followUp({
                ephemeral: true,
                content: i
            })
        }
    }
}

export interface geraldCommandOptions extends sapphire.CommandOptions {
    usage?: string,
    alwaysEnabled?: boolean,
    private?: boolean
    settings?: Setting[]
}

declare class CommandStore extends sapphire.AliasStore<GeraldCommand> {
    constructor();
    get categories(): string[];
    unload(name: string | GeraldCommand): Promise<GeraldCommand>;
    loadAll(): Promise<void>;
}

export abstract class GeraldCommand extends sapphire.Command {
    settings: Setting[] | null;
    alwaysEnabled: boolean
    private: boolean
    public constructor(context: sapphire.Command.Context, options: geraldCommandOptions) {
        super(context, {
            ...options,
        });
        this.settings = options.settings ?? null
        this.alwaysEnabled = options.alwaysEnabled ?? false
        this.private = options.private ?? false
    }
    private messageHandler(error: unknown, message: discord.Message, args: sapphire.Args, context: sapphire.MessageCommand.RunContext): void {
        let channel = message.channel
        if (error instanceof sapphire.UserError) {
            channel.send(error.message)
        } else {
            args
            context
            if (process.env.BUGSNAG_KEY) {
                bugsnag.notify(JSON.stringify(error))
            }
            console.error(error);
            let embed = new discord.MessageEmbed()
            embed.setTitle(`Error: Command "${context.commandName}" failed`)
            embed.setColor("RED")
            embed.setTimestamp(new Date())
            embed.setDescription("An unhandled exception occurred.")
            const content = (<any>error).message as string
            embed.addField("Message", content ?? JSON.stringify(error))
            channel.send({
                embeds: [embed]
            })
        }

    }
    private slashHandler(error: unknown, interaction: discord.CommandInteraction, context: sapphire.ChatInputCommand.RunContext): void {
        if (error instanceof sapphire.UserError) {
            interaction.reply(error.message)
        } else {
            context
            if (process.env.BUGSNAG_KEY) {
                bugsnag.notify(JSON.stringify(error))
            }
            console.error(error);
            let embed = new discord.MessageEmbed()
            embed.setTitle(`Error: Command "${context.commandName}" failed`)
            embed.setColor("RED")
            embed.setTimestamp(new Date())
            embed.setDescription("An unhandled exception occurred.")
            const content = (<any>error).message as string
            embed.addField("Message", content ?? JSON.stringify(error))
            interaction.followUp({
                embeds: [embed]
            })
        }
    }
    protected slashRun?(interaction: discord.CommandInteraction, reply: discord.Message, context: sapphire.ChatInputCommand.RunContext): sapphire.Awaitable<unknown>
    protected chatRun?(message: discord.Message, args: sapphire.Args, context: sapphire.MessageCommand.RunContext): sapphire.Awaitable<unknown>
    protected menuRun?(interaction: discord.ContextMenuInteraction, context: sapphire.ContextMenuCommand.RunContext): sapphire.Awaitable<unknown>

    async chatInputRun(interaction: discord.CommandInteraction, context: sapphire.ChatInputCommand.RunContext) {
        if (!this.slashRun) return
        await interaction.deferReply()
        let reply = await interaction.fetchReply()
        let x;
        try {
            x = this.slashRun(interaction, <discord.Message>reply, context)
        } catch (error) {
            this.slashHandler(error, interaction, context)
        }
        if (!(x instanceof Promise)) return
        x.catch(e => {
            this.slashHandler(e, interaction, context)
        })

    }
    messageRun(message: discord.Message, args: sapphire.Args, context: sapphire.MessageCommand.RunContext) {
        if (!this.chatRun) return
        let x;
        try {
            x = this.chatRun(message, args, context)
        } catch (error) {
            this.messageHandler(error, message, args, context)
        }
        if (!(x instanceof Promise)) return
        x.catch(e => {
            this.messageHandler(e, message, args, context)
        })

    }

    protected async getSetting(guild: string): Promise<SettingWithData[] | null> {
        if (!this.settings) return null
        let x = await prisma.module_settings.findUnique({
            where: {
                guildid_moduleName: {
                    guildid: guild,
                    moduleName: this.name
                }
            }
        })
        if (x === null) {
            let a = await prisma.module_settings.create({
                data: {
                    guildid: guild,
                    moduleName: this.name,
                    settings: JSON.stringify(this.settings.map(i => {
                        return {
                            id: i.id,
                            value: i.default
                        }
                    }))
                }
            })
            let parsed = <Array<{ id: string, value: string }>>JSON.parse(a.settings)
            return this.settings.map(i => {
                return <SettingWithData>{
                    ...i,
                    value: parsed.find(y => y.id === i.id)!.value
                }
            })
        }
        let parsed = <Array<{ id: string, value: string }>>JSON.parse(x.settings)
        return this.settings.map(i => {
            return <SettingWithData>{
                ...i,
                value: parsed.find(y => y.id === i.id)!.value
            }
        })
    }
    protected async changeSetting(guild: string, settings: SettingWithData[], id: string, value: settingTypes) {
        await prisma.module_settings.create({
            data: {
                guildid: guild,
                moduleName: this.name,
                settings: JSON.stringify(settings.map(i => {
                    if (i.id === id) {
                        return <SettingWithData>{
                            ...i,
                            value: value
                        }
                    }
                    return <SettingWithData>{
                        ...i,
                        value: i.value
                    }
                }))
            }
        })
    }
    public async settingsHandler(interaction: discord.CommandInteraction) {
        if (!this.settings) return
        while (true) {
            let i = await settingsRun(interaction, (await this.getSetting(interaction.guildId!)!)!, this.changeSetting)
            if (i === false) break;
            else if (i === true) {}
            else if (typeof i === "string" && i === "end") {}
            else if (typeof i === "string") interaction.followUp({
                ephemeral: true,
                content: i
            })
        }
    }
}
/*
export class CommandManager extends Module {
    constructor() {
        super({
            name: "Command Management",
            description: "Allows management of commands",
            hidden: true,
            settings: [{
                id: "disabledInGuild",
                default: [],
            },
            {
                id: "channelDisabled",
                default: []
            },
            {
                id: "roleDisabled",
                default: []
            }]
        })
    }
    async load(): Promise<void> { }
    async unload(): Promise<void> { }
    async settingsHandler(interaction: discord.CommandInteraction) {
        let settings = await this.getSetting(interaction.guildId!)
        if (!settings) return
        let disabledInServer = <SettingGet<string[]>>settings.find(i => i.id === "disabledInGuild")
        let channelDisabled = <SettingGet<{ cmd: string, channel: string | string[] }[]>>settings.find(i => i.id === "channelDisabled")
        let roleDisabled = <SettingGet<{ cmd: string, role: string | string[] }[]>>settings.find(i => i.id === "roleDisabled")
        console.log(disabledInServer)
        console.log(channelDisabled)
        console.log(roleDisabled)
        let serverStr = (disabledInServer.value!.length === 0) ? "None" : disabledInServer.value!.join(", ")
        let channelStr = (channelDisabled.value!.length === 0) ? "None" : channelDisabled.value!.map(i => {
            return `${i}: Usage in ${typeof i.channel == "string" ? `<#${i.channel}>` : i.channel.map(i => `<#${i}>`).join(", ")} disabled.`
        }).join("\n")
        let roleStr = (roleDisabled.value!.length === 0) ? "None" : roleDisabled.value!.map(i => {
            return `${i}: Usage by ${typeof i.role == "string" ? `<@&${i.role}>` : i.role.map(i => `<@&${i}>`).join(", ")} disabled.`
        }).join("\n")
        let x = new discord.MessageEmbed()
        x.setTitle("Command management")
        x.setColor("BLURPLE")
        .setTimestamp(new Date())
        .addField(`Commands disabled in ${interaction.guild!.name}`, serverStr)
        .addField(`Commands blocked in channels`,  channelStr)
        .addField(`Command usage by roles disabled`, roleStr)
        let row1 = new discord.MessageActionRow().addComponents(new discord.MessageButton().setCustomId("addServer").setLabel("Disable module in server").setStyle("PRIMARY"),
        new discord.MessageButton().setCustomId("addChannel").setLabel("Disable command in channel").setStyle("PRIMARY"),
        new discord.MessageButton().setCustomId("addRole").setLabel("Disable command usage by role").setStyle("PRIMARY"),
        utils.dismissButton)
        let row2 = new discord.MessageActionRow().addComponents(new discord.MessageButton().setCustomId("rmServer").setLabel("Enable module in server").setStyle("PRIMARY"),
        new discord.MessageButton().setCustomId("rmChannel").setLabel("Enable command in channel").setStyle("PRIMARY"),
        new discord.MessageButton().setCustomId("rmRole").setLabel("Enable command usage by role").setStyle("PRIMARY"))
        await interaction.editReply({
            embeds: [x],
            components: [row1, row2]
        });
        let msg = <discord.Message>await interaction.fetchReply();
        let request: discord.Message;
        let commands = <CommandStore>bot.stores.get("commands")
        let modules = sapphire.container.modules.filter(x => x.hidden === false)
        await utils.buttonListener<void>({
            interaction: interaction,
            response: msg,
            onClick: async (i, next) => {
                if (i.customId.startsWith("add")) await disableItem(i)
                request = <discord.Message>await i.fetchReply()
                let category = await utils.awaitSelectMenu(interaction, <discord.Message>request)

                if (category) {
                    console.log("here")
                    console.log(category.values)
                    next()
                }

            },
            onEnd() {
                (<discord.Message>request).delete()
                utils.disableButtons(msg)
            }
        })

        async function disableItem(i: discord.ButtonInteraction<discord.CacheType>) {
            let map = commands.filter(cmd => cmd.alwaysEnabled === false && cmd.private === false).map(i => {
                return {
                    label: `Command: ${i.name}`,
                    value: i.name,
                    description: i.description
                };
            });
            await i.reply({
                content: `Select an item to disable`,
                components: [new discord.MessageActionRow()
                    .addComponents(
                        new discord.MessageSelectMenu()
                            .setCustomId('select_category')
                            .setPlaceholder('Nothing selected')
                            .addOptions(i.customId.endsWith("Server") ? map.concat(modules.map(i => {
                                return {
                                    label: `Module: ${i.name}`,
                                    value: i.name,
                                    description: i.description
                                };
                            })) : map)
                    )]
            });
        }
    }

}*/