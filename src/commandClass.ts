import * as sapphire from "@sapphire/framework"
import * as discord from 'discord.js';
import _ from "lodash";
import { bugsnag, prisma } from ".";

type optionTypes = "string" | "number" | "discord.Channel" | "discord.Role"
type settingTypes = string | number | discord.Channel | discord.Role

declare module '@sapphire/pieces' {
    interface Container {
        modules: Module[];
    }
}

export interface ModuleOptions {
    name: string,
    description: string,
    settings?: Setting[]
}

interface Setting {
    id: string
    name: string;
    description: string;
    type: optionTypes;
    default: settingTypes;
    choices?: settingTypes[] | undefined
}

interface SettingWithData extends Setting {
    value: settingTypes | undefined
}
class SettingsManager {
    readonly settings: Setting[]
    readonly module: string
    constructor(settings: Setting[], module: string) {
        this.settings = settings
        this.module = module
    }
    public async getSetting(guild: string, settingID: null): Promise<SettingWithData[]>;
    public async getSetting(guild: string, settingID: string): Promise<SettingWithData>;
    public async getSetting(guild: string, settingID: string | null = null) {
        let x = await prisma.module_settings.findUnique({
            where: {
                guildid_moduleName: {
                    guildid: guild,
                    moduleName: this.module
                }
            }
        })
        if (x === null) {
            let dbSettings = this.settings.map(i => {
                return { id: i.id, value: i.default }
            })
            await prisma.module_settings.create({
                data: {
                    guildid: guild,
                    moduleName: this.module,
                    settings: JSON.stringify(dbSettings)
                }
            })
            if (!settingID) return this.settings.map(x => {
                return this.formatSetting(x)
            })
            else {
                let a = this.settings.find(i => i.id === settingID)
                if (!a) throw new Error("")
                return this.formatSetting(a)
            }
        } else {
            let a: {
                id: string,
                value: string
            }[] = <any>x.settings.map(i => {
                return JSON.parse(i)
            })
            if (!settingID) return a.map(x => {
                return this.dbOutputToSetting(x)
            })
            else {
                let b = a.find(i => i.id === settingID)
                if (!b) throw new Error("")
                return this.dbOutputToSetting(b)
            }

        }
    }

    public async changeSettings() { }
    private dbOutputToSetting(x: { id: string, value: string }): SettingWithData {
        if (!this.settings) throw new Error()
        let a = this.settings.find(i => i.id === x.id)
        if (!a) throw new Error();
        return <SettingWithData>{
            ...a,
            value: x.value
        }
    }
    private formatSetting(x: Setting): SettingWithData {
        return {
            id: x.id,
            name: x.name,
            description: x.description,
            type: x.type,
            default: x.default,
            choices: x.choices,
            value: x.default
        };
    }

}

export abstract class Module {
    description: string;
    name: string;
    settings: SettingsManager | null
    constructor(options: ModuleOptions) {
        this.description = options.description;
        this.name = options.name
        if (options.settings) this.settings = new SettingsManager(options.settings, this.name)
        else this.settings = null
    }

    abstract load(): Promise<void>
    abstract unload(): Promise<void>
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
        if (options.settings) this.settings = new SettingsManager(options.settings, this.name)
        else this.settings = null
        if (!options.fullCategory) options.fullCategory = []
        if (options.ownerOnly === true) options.fullCategory.push("_owner")
        if (options.hidden === true) options.fullCategory.push("_hidden")
        if (options.alwaysEnabled === true) options.fullCategory.push("_enabled")
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
    protected slashRun?(interaction: discord.CommandInteraction, context: sapphire.ChatInputCommand.RunContext): sapphire.Awaitable<unknown>
    protected chatRun?(message: discord.Message, args: sapphire.Args, context: sapphire.MessageCommand.RunContext): sapphire.Awaitable<unknown>
    protected menuRun?(interaction: discord.ContextMenuInteraction, context: sapphire.ContextMenuCommand.RunContext): sapphire.Awaitable<unknown>

    chatInputRun(interaction: discord.CommandInteraction, context: sapphire.ChatInputCommand.RunContext) {
        if (!this.slashRun) return
        let x;
        try {
            x = this.slashRun(interaction, context)
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
