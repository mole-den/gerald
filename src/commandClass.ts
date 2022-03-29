import * as sapphire from "@sapphire/framework"
import * as discord from 'discord.js';
import _ from "lodash";
import { bugsnag, prisma } from ".";

type settingTypes = string | number | boolean | Array<settingTypes> | {[key: string]: settingTypes}

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
class SettingsManager {
    readonly settings: Setting[]
    readonly module: string
    settingsHandler: (interaction: discord.CommandInteraction) => Promise<void>
    constructor(settings: Setting[], module: string, handler: (interaction: discord.CommandInteraction) => Promise<void>) {
        this.settings = settings
        this.module = module
        this.settingsHandler = handler
    }
    public async getSetting(guild: string): Promise<SettingWithData[]> {
        let x = await prisma.module_settings.findUnique({
            where: {
                guildid_moduleName: {
                    guildid: guild,
                    moduleName: this.module
                }
            }
        })
        if (x === null) {
            let a = await prisma.module_settings.create({
                data: {
                    guildid: guild,
                    moduleName: this.module,
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
}

export interface ModuleOptions {
    name: string,
    description: string,
    settings?: Setting[]
}

export abstract class Module {
    description: string;
    name: string;
    settings: SettingsManager | null
    constructor(options: ModuleOptions) {
        this.description = options.description;
        this.name = options.name
        if (options.settings) this.settings = new SettingsManager(options.settings, this.name, this.settingsHandler)
        else this.settings = null
    }

    abstract load(): Promise<void>
    abstract unload(): Promise<void>
    public async settingsHandler(interaction: discord.MessageInteraction) {
        interaction
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
    settings: SettingsManager | null;
    public constructor(context: sapphire.Command.Context, options: geraldCommandOptions) {
        super(context, {
            ...options,
        });
        if (options.settings) this.settings = new SettingsManager(options.settings, this.name, this.settingsHandler)
        else this.settings = null
        if (!options.fullCategory) options.fullCategory = []
        if (options.ownerOnly === true) options.fullCategory.push("_owner")
        if (options.hidden === true) options.fullCategory.push("_hidden")
        if (options.alwaysEnabled === true) options.fullCategory.push("_enabled")
    }
    private async settingsHandler(interaction: discord.CommandInteraction) {
        interaction;
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
    /*
    contextMenuRun(interaction: discord.ContextMenuInteraction, context: sapphire.ContextMenuCommand.RunContext) {
        if (!this.menuRun) return
        let x;
        try {
            x = this.menuRun(interaction, context)
        } catch (error) {
            this.errorHandler(error, interaction, context)
        }
        if (!(x instanceof Promise)) return
        x.catch(e => {
            this.errorHandler(e, interaction, context)
        })
    }*/
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
    async load(): Promise<void> {}
    async unload(): Promise<void> {}
    override async settingsHandler(interaction: discord.CommandInteraction) {
        let settings = await this.settings!.getSetting(interaction.guildId!)
        let disabledInServer = <SettingGet<string[]>>settings.find(i => i.id === "disabledInGuild")
        let channelDisabled = <SettingGet<{cmd: string, channel: string}[]>>settings.find(i => i.id === "channelDisabled")
        let roleDisabled = <SettingGet<{cmd: string, role: string}[]>>settings.find(i => i.id === "roleDisabled")
        console.log(disabledInServer)
        console.log(channelDisabled)
        console.log(roleDisabled)
        /*
        let x = new discord.MessageEmbed()
        x.setTitle("Command management")
        x.setColor("BLURPLE")
        .setTimestamp(new Date())
        .addField("Current command settings", )
        interaction.editReply({

        })*/
    }
 
}