import * as sapphire from "@sapphire/framework";
import * as discord from "discord.js";

export interface GeraldModule {
	onModuleEnabledInGuild(guildid: string): void
	onModuleStart(): void
}

export const ApplyPreconditions = (conditions: sapphire.PreconditionEntryResolvable[]) => (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
	const method = descriptor.value;
	descriptor.value = async function (...args: unknown[]) {
		const c = new sapphire.PreconditionContainerArray(conditions);
		const results = await c.chatInputRun(args[0] as discord.CommandInteraction, this as sapphire.ChatInputCommand);
		if (results.error) {
			(args[0] as discord.CommandInteraction).reply({
				content: results.error.message,
				ephemeral: true
			});
			return;
		}
		method.apply(this, args);
	};
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GeraldCommandOptions extends sapphire.CommandOptions {
	subcommandPreconditions?: {
		cmd: string,
		preconditions: sapphire.PreconditionEntryResolvable[]
	}[]
}

export interface GeraldModuleSetting {
	id: string
	name: string
	description: string
	detailedDesc?: string
	default: string
	type: "string" | "number" | "boolean" | "user" | "channel" | "role",
	multiple: boolean
}
export class GeraldCommand extends sapphire.Command {
	isModule(x: unknown): x is GeraldCommand & GeraldModule {
		if (typeof x === "object" && Object.keys(x!).includes("onModuleStart")) return true;
		return false;
	}
	protected subcommandPreconditions: Map<string, sapphire.PreconditionEntryResolvable[]> | null;
	public constructor(context: sapphire.Command.Context, options: GeraldCommandOptions) {
		super(context, {
			...options,
		});
		if (options.subcommandPreconditions) {
			this.subcommandPreconditions = new Map();
			options.subcommandPreconditions.forEach(o => {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				this.subcommandPreconditions!.set(o.cmd, o.preconditions);
			});
		} else this.subcommandPreconditions = null;
	}

	public async chatInputRun(interaction: discord.CommandInteraction, context: sapphire.ChatInputCommandContext) {
		try {
			const group = interaction.options.getSubcommandGroup(false);
			const sub = interaction.options.getSubcommand(false);
			if (!sub) throw new Error("Invalid subcommand");
			const id = group ? `${group}_${sub}` : sub;
			const func: unknown = (this as never)[id];
			if (typeof func !== "function") throw new Error("Invalid subcommand");
			await func.bind(this)(interaction, context);
		} catch (error) {
			this.slashHandler(error, interaction, context);
		}

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
			const content = (error as Error).message as string | undefined;
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