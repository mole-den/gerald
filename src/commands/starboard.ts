import { GeraldCommand, GeraldModule, GeraldCommandOptions } from "../commandClass";
import { ApplyOptions } from "@sapphire/decorators";
import { CommandInteraction, MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { ApplicationCommandRegistry, ChatInputCommandContext, RegisterBehavior } from "@sapphire/framework";
import { bot } from "..";
@ApplyOptions<GeraldCommandOptions>({
	name: "starboard",
	description: "Starboard.",
	requiredUserPermissions: ["MANAGE_CHANNELS"],
	requiredClientPermissions: [],
	preconditions: ["GuildOnly"],
}) export class Starboard extends GeraldCommand implements GeraldModule {
	public override registerApplicationCommands(reg: ApplicationCommandRegistry) {
		reg.registerChatInputCommand((cmd) => {
			return cmd.setName(this.name)
				.setDescription(this.description)
				.addSubcommand(x =>
					x.setName("setchannel").setDescription("Set the starboard channel.")
						.addChannelOption(o =>
							o.setName("channel").setDescription("Channel.").setRequired(true)))
				.addSubcommand(x => x.setName("disable").setDescription("Disable the starboard."))
				.addSubcommand(x => x.setName("minstars").setDescription("Amount of stars required for a message to go on the starboard.").addIntegerOption(o => o.setName("amount").setDescription("Amount of stars.").setRequired(true)))
				.addSubcommand(x => x.setName("allownsfw").setDescription("Allow NSFW messages to go on the starboard.").addBooleanOption(o => o.setName("allow").setDescription("Allow NSFW messages.").setRequired(true)))
				.addSubcommandGroup(x => x.setName("emoji").setDescription("Set the emoji to be used as \"stars\".")
					.addSubcommand(i => i.setName("list").setDescription("List the emoji used as stars."))
					.addSubcommand(i => i.setName("add").setDescription("Add an emoji to be used as a \"stars\".").addStringOption(o => o.setName("emoji").setDescription("Emoji.").setRequired(true)))
					.addSubcommand(i => i.setName("remove").setDescription("Remove an emoji from the list of emoji used as stars.").addStringOption(o => o.setName("emoji").setDescription("Emoji.").setRequired(true))));
		}, {
			behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
			idHints: []
		});
	}
	channels: string[] = [];
	settings = null;
	private reactionHandler(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
		
	}
	public async chatInputRun(interaction: CommandInteraction, context: ChatInputCommandContext) {
		try {
			const group = interaction.options.getSubcommandGroup();
			const func: unknown = (this as any)[group ? `${group}-${interaction.options.getSubcommand()}` : interaction.options.getSubcommand()];
			if (typeof func !== "function") throw new Error("Invalid subcommand");
			await func.bind(this)(interaction, context);
		} catch (error) {
			this.slashHandler(error, interaction, context);
		}

	}

	async onModuleDisabledInGuild() {
		return true;
	}

	async onModuleEnabledInGuild () {
		return true;
	}

	async onModuleStart() {
		bot.on("messageReactionAdd", this.reactionHandler.bind(this));
	}
}