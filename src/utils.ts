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
            }, componentType: "BUTTON", time: 10000
        })
            .then(() => interaction.deleteReply())
            .catch(() => {
                interaction.editReply({
                    components: [...button]
                })
            });

    }
}