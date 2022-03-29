import * as sapphire from "@sapphire/framework"
import * as discord from 'discord.js';
import _ from "lodash";
import { bugsnag, prisma } from ".";

type settingTypes = string | number | boolean | Array<settingTypes> | { [key: string]: settingTypes }

declare module '@sapphire/pieces' {
    interface Container {
        modules: Module[];
    }
}

interface Setting {
    id: string
    name?: string;
    description?: string;
    default: settingTypes;
    choices?: settingTypes | undefined
}

interface SettingWithData extends Setting {
    value: settingTypes | undefined
}

interface SettingGet<T extends settingTypes> extends Setting {
    value: T | undefined
}

export interface ModuleOptions {
    name: string,
    description: string,
    settings?: Setting[]
}

export abstract class Module {
    description: string;
    name: string;
    settings: Setting[] | null
    constructor(options: ModuleOptions) {
        this.description = options.description;
        this.name = options.name
        this.settings = options.settings ?? null
    }

    abstract load(): Promise<void>
    abstract unload(): Promise<void>
    public async settingsHandler(interaction: discord.CommandInteraction): Promise<void> {
        interaction
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
                        return <SettingWithData>{
                            ...i,
                            value: i.default
                        }
                    }))
                }
            })
            return JSON.parse(a.settings)
        }
        return JSON.parse(x.settings)
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
}

export interface geraldCommandOptions extends sapphire.CommandOptions {
    usage?: string,
    alwaysEnabled?: boolean,
    hidden?: boolean,
    ownerOnly?: boolean,
    settings?: Setting[]
}

export abstract class GeraldCommand extends sapphire.Command {
    settings: Setting[] | null;
    public constructor(context: sapphire.Command.Context, options: geraldCommandOptions) {
        super(context, {
            ...options,
        });
        this.settings = options.settings ?? null
        if (!options.fullCategory) options.fullCategory = []
        if (options.ownerOnly === true) options.fullCategory.push("_owner")
        if (options.hidden === true) options.fullCategory.push("_hidden")
        if (options.alwaysEnabled === true) options.fullCategory.push("_enabled")
    }
    public async settingsHandler(interaction: discord.CommandInteraction): Promise<void> {
        interaction
    }
    public async getSetting(guild: string): Promise<SettingWithData[] | null> {
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
                        return <SettingWithData>{
                            ...i,
                            value: i.default
                        }
                    }))
                }
            })
            return JSON.parse(a.settings)
        }
        return JSON.parse(x.settings)
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
}

export class CommandManager extends Module {
    constructor() {
        super({
            name: "Command Management",
            description: "Allows management of commands",
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
        await interaction.editReply({
            embeds: [x],
            components: []
        })
    }

}