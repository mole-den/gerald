import * as discord from 'discord.js'
export namespace utils {
    export let dismissButton = new discord.MessageButton().setLabel("Dismiss").setCustomId('dismissEmbed').setStyle("DANGER")
    export function handleDismissButton(interaction: discord.CommandInteraction, response: discord.Message) {
        let button = response.components;
        button.forEach(i => {
            i.components.forEach(x => {
                if (x.customId === "dismissEmbed") x.disabled = true;
            })
        })
        response.awaitMessageComponent({
            filter: (i) => {
                if (i.user.id !== interaction.user.id) {
                    i.reply({
                        ephemeral: true,
                        content: `Please stop interacting with the components on this message. They are only for ${interaction.user.toString()}.`,
                        allowedMentions: { users: [], roles: [] }
                    })
                    return false
                }
                return true
            }, componentType: "BUTTON", time: 15000
        })
            .then(() => interaction.deleteReply())
            .catch(() => {
                interaction.editReply({
                    components: [...button]
                })
            });

    }
    export async function awaitButtonResponse(interaction: discord.CommandInteraction, response: discord.Message, type?: string, timeout: number = 15000) {
        let x: discord.ButtonInteraction<discord.CacheType>;
        try {
            x = await response.awaitMessageComponent({
                filter: (i) => {
                    if (i.user.id !== interaction.user.id) {
                        i.reply({
                            ephemeral: true,
                            content: `Please stop interacting with the components on this message. They are only for ${interaction.user.toString()}.`,
                            allowedMentions: { users: [], roles: [] }
                        })
                        return false
                    }
                    if (type && i.customId !== type) {
                        return false
                    }
                    return true
                }, componentType: "BUTTON", time: timeout
            })
        } catch {
            return null
        }
        return x;
    }
    interface buttonListenerInput {
        interaction: discord.CommandInteraction;
        response: discord.Message;
        type?: string;
        timeout?: number;
        onClick: (button: discord.ButtonInteraction, next: (value: discord.ButtonInteraction) => void) => Promise<void>;
        onEnd: () => void
    }
    export function buttonListener(input: buttonListenerInput): Promise<discord.ButtonInteraction> {
        return new Promise((resolve) => {
            const collector = input.response.createMessageComponentCollector({ componentType: 'BUTTON', time: input.timeout ?? 15000 });

            collector.on('collect', async i => {
                if (i.user.id === input.interaction.user.id) {
                    if (i.customId === "dismissEmbed") return await input.interaction.deleteReply()
                    if (input.type) {
                        if (input.type === i.customId) return await input.onClick(i, next)
                        else return
                    }
                    return await input.onClick(i, next)
                } else {
                    return await i.reply({
                        ephemeral: true,
                        content: `Please stop interacting with the components on this message. They are only for ${input.interaction.user.toString()}.`,
                        allowedMentions: { users: [], roles: [] }
                    })
                }
            });

            collector.on('end', () => {
                utils.disableButtons(input.response, input.interaction)
            });
            function next(value: discord.ButtonInteraction) {
                resolve(value)
            }
        })

    }
    export async function disableButtons(response: discord.Message, interaction: discord.CommandInteraction) {
        let button = response.components;
        button.forEach(i => {
            i.components.forEach(x => {
                x.disabled = true;
            })
        })
        await utils.pCall(interaction.editReply, {
            components: [...button]
        })
    }
    export async function awaitSelectMenu(interaction: discord.CommandInteraction, response: discord.Message, timeout: number = 15000) {
        let x: discord.SelectMenuInteraction<discord.CacheType>;
        try {
            x = await response.awaitMessageComponent({
                filter: (i) => {
                    if (i.user.id !== interaction.user.id) {
                        i.reply({
                            ephemeral: true,
                            content: `Please stop interacting with the components on this message. They are only for ${interaction.user.toString()}.`,
                            allowedMentions: { users: [], roles: [] }
                        })
                        return false
                    }
                    return true
                }, componentType: "SELECT_MENU", time: timeout
            })
        } catch {
            return null
        }
        return x;

    }
    class Failed {
        data: unknown
        constructor(x: unknown) {
            this.data = x
        }
    }
    export const pCall = async <T, U>(fn: (...args: T[]) => U, args: T) => {
        let x: U;
        try {
            x = fn(args)
            return x;
        } catch (error) {
            return new Failed(error)
        }
      }
}