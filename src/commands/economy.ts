import { ApplyOptions } from "@sapphire/decorators";
import { ApplicationCommandRegistry, RegisterBehavior } from "@sapphire/framework";
import { GeraldCommand, GeraldCommandOptions } from "../commandClass";
@ApplyOptions<GeraldCommandOptions>({
	name: "economy",
	description: "economy",
	requiredUserPermissions: [],
	requiredClientPermissions: [],
	preconditions: ["GuildOnly"],
})
export class Economy extends GeraldCommand {
	public override registerApplicationCommands(reg: ApplicationCommandRegistry) {
		reg.registerChatInputCommand((cmd) => {
			return cmd.setName(this.name)
				.setDescription(this.description)
				.addSubcommand(s =>
					s.setName("work").setDescription("Earn money.").addStringOption(o =>
						o.setName("job").setDescription("The job to earn money from.").setRequired(true)
					)
				).addSubcommand(s => 
					s.setName("stats").setDescription("Stats about the economy.")
				).addSubcommand(s => 
					s.setName("leaderboard").setDescription("View leaderboard for the economy.")
				).addSubcommand(s => 
					s.setName("balance").setDescription("View a user's balance.").addUserOption(o => 
						o.setName("user").setDescription("Whose balance to view.").setRequired(false)
					)
				).addSubcommand(s => 
					s.setName("gift").setDescription("Give another user money.").addUserOption(o => 
						o.setName("user").setDescription("The user to give money to.").setRequired(true)
					).addStringOption(o => 
						o.setName("amount").setDescription("The amount of money to give (or 'all')").setRequired(true)
					)
				).addSubcommand(s => 
					s.setName("store").setDescription("View the store and buy items.")
				).addSubcommand(s =>
					s.setName("editstore").setDescription("Edit items in the store.").addStringOption(o => 
						o.setName("action").setDescription("The action to perform").addChoice("add", "add").addChoice("remove", "remove").addChoice("edit", "edit").setRequired(true)
					).addStringOption(o => 
						o.setName("item").setDescription("The name of the item to add/remove/edit")
					)
				).addSubcommand(s =>
					s.setName("settings").setDescription("Server economy settings.")	
				).addSubcommand(s => 
					s.setName("channelsettings").setDescription("Channel specific settings.")
				);
		}, {
			behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
			idHints: ["1011846150770393118"]
		});
	}
	
}