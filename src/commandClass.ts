import * as sapphire from "@sapphire/framework";
import * as discord from "discord.js";
export interface GeraldModule {
	onModuleDisabledInGuild(guildid: string): void
	onModuleEnabledInGuild(guildid: string): void
	onModuleStart(): void
	settings: {
		id: string,
		name: string,
		description: string,
		default: string
	}[] | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface geraldCommandOptions extends sapphire.CommandOptions {}

export interface GeraldModuleSetting {
	id: string
	name: string
	description: string
	detailedDesc?: string
	default: string
	type: "string" | "number" | "boolean" | "user" | "channel" | "role",
	multiple: boolean
}
export abstract class GeraldCommand extends sapphire.Command {
	isModule(x: any): x is GeraldCommand & GeraldModule {
		return x["onModuleStart"] ? true : false;
	}
	public constructor(context: sapphire.Command.Context, options: geraldCommandOptions) {
		super(context, {
			...options,
		});
	}
	protected async slashHandler(error: unknown, interaction: discord.CommandInteraction, context: sapphire.ChatInputCommand.RunContext): Promise<void> {
		let reply;
		try {
			reply = await interaction.fetchReply();

		} catch{
			reply = null;
		}
		if (error instanceof sapphire.UserError) interaction.reply(error.message);
		else {
			context;
			console.error(error);
			const embed = new discord.MessageEmbed();
			embed.setTitle(`Error: Command "${context.commandName}" failed`);
			embed.setColor("RED");
			embed.setTimestamp(new Date());
			embed.setDescription("An unhandled exception occurred.");
			const content = (<Error>error).message as string;
			embed.addField("Message", content ?? JSON.stringify(error));
			if (reply) interaction.followUp({
				embeds: [embed]
			});
			else interaction.reply({
				embeds: [embed]
			});
		}
	}
}