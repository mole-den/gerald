import * as sapphire from "@sapphire/framework";
import * as discord from "discord.js";

export interface GeraldModule {
	onModuleDisabledInGuild(guildid: string): void
	onModuleEnabledInGuild(guildid: string): void
	onModuleStart(): void
	settings: GeraldModuleSetting[] | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GeraldCommandOptions extends sapphire.CommandOptions {}

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
	public constructor(context: sapphire.Command.Context, options: GeraldCommandOptions) {
		super(context, {
			...options,
		});
	}
	protected async slashHandler(error: unknown, interaction: discord.CommandInteraction, context: sapphire.ChatInputCommand.RunContext): Promise<void> {
		const group = interaction.options.getSubcommandGroup(false);
		const sub = interaction.options.getSubcommand(false);
		if (error instanceof sapphire.UserError) interaction.reply(error.message);
		else {
			context;
			console.error(error);
			const embed = new discord.MessageEmbed()
				.setTitle(`Error: Command "${context.commandName} ${group ? group : ""} ${sub ? sub : ""}" failed`)
				.setColor("RED")
				.setTimestamp(new Date())
				.setDescription("An unhandled exception occurred.");
			const content = (<Error>error).message as string;
			embed.addField("Message", content ?? JSON.stringify(error));
			try {
				await interaction.reply({
					embeds: [embed]
				});
			} catch {
				interaction.channel?.send({
					embeds: [embed]
				});
			}
		}
	}
}