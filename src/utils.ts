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
    export async function disableButtons(response: discord.Message, interaction: discord.CommandInteraction) {
        let button = response.components;
        button.forEach(i => {
            i.components.forEach(x => {
                x.disabled = true;
            })
        })
        interaction.editReply({
            components: [...button]
        })
    }
    export async function awaitSelectMenu(interaction: discord.CommandInteraction, response: discord.Message, timeout: number = 15000)  {
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
}