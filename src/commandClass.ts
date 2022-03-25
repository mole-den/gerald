import * as sapphire from "@sapphire/framework"
import * as discord from 'discord.js';
import Bugsnag from '@bugsnag/js';
if (process.env.BUGSNAG_KEY) Bugsnag.start({
	apiKey: process.env.BUGSNAG_KEY,
	appVersion: (require('../package.json').version)
});

export interface geraldCommandOptions extends sapphire.CommandOptions {
    usage?: string,
    alwaysEnabled?: boolean,
    hidden?: boolean,
    ownerOnly?: boolean
}

export abstract class GeraldCommand extends sapphire.Command {
    public constructor(context: sapphire.Command.Context, options: geraldCommandOptions) {
        if (!options.fullCategory) options.fullCategory = []
        if (options.ownerOnly === true) options.fullCategory.push("_owner")
        if (options.hidden === true) options.fullCategory.push("_hidden")
        if (options.alwaysEnabled === true) options.fullCategory.push("_enabled")
        super(context, {
            ...options,
        });
    }
    private messageHandler(error: unknown, message: discord.Message, args: sapphire.Args, context: sapphire.MessageCommand.RunContext): void {
        let channel = message.channel
        if (error instanceof sapphire.UserError) {
            channel.send(error.message)
        } else {
            args
            context
            /*
            if (process.env.BUGSNAG_KEY) {
                Bugsnag.leaveBreadcrumb(JSON.stringify({
                    message: message,
                    args: args,
                    content: context
                }))
                Bugsnag.notify(JSON.stringify(error))
            }*/
            console.error(error);
            let embed = new discord.MessageEmbed()
            embed.setTitle("Error")
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
            /*
            if (process.env.BUGSNAG_KEY) {
                Bugsnag.leaveBreadcrumb(JSON.stringify({
                    interaction: interaction,
                    content: context
                }))
                Bugsnag.notify(JSON.stringify(error))
            }*/
            console.error(error);
            let embed = new discord.MessageEmbed()
            embed.setTitle("Error")
            embed.setColor("RED")
            embed.setTimestamp(new Date())
            embed.setDescription("An unhandled exception occurred.")
            const content = (<any>error).message as string
            embed.addField("Message", content ?? JSON.stringify(error))
            interaction.reply({
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
