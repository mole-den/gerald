import * as sapphire from "@sapphire/framework";
import * as discord from "discord.js";
import { bugsnag } from ".";

export interface ModuleOptions {
	name: string,
	description: string,
	hidden?: boolean
}

interface Subcommand {
	name: string,
	handlerName: string,
}
export interface geraldCommandOptions extends sapphire.CommandOptions {
	usage?: string,
	settings?: {
		id: string,
		name: string,
		description: string,
		default: string
	}[],
	alwaysEnabled?: boolean,
	private?: boolean
	subcommands?: Subcommand[]
}

export abstract class GeraldCommand extends sapphire.Command {
	alwaysEnabled: boolean;
	private: boolean;
	settings: {
		id: string,
		name: string,
		description: string,
		default: string
	}[] | null;
	subcommands: Subcommand[] | null;
	public constructor(context: sapphire.Command.Context, options: geraldCommandOptions) {
		super(context, {
			...options,
		});
		this.settings = options.settings ?? null;
		this.subcommands = options.subcommands ?? null;
		this.alwaysEnabled = options.alwaysEnabled ?? false;
		this.private = options.private ?? false;
	}
	public onCommandDisabled(): void {
		return;
	}
	public onCommandStart(): void {
		return;
	}
	private slashHandler(error: unknown, interaction: discord.CommandInteraction, context: sapphire.ChatInputCommand.RunContext): void {
		if (error instanceof sapphire.UserError) interaction.reply(error.message);
		else {
			context;
			if (process.env.BUGSNAG_KEY) bugsnag.notify(JSON.stringify(error));
			console.error(error);
			const embed = new discord.MessageEmbed();
			embed.setTitle(`Error: Command "${context.commandName}" failed`);
			embed.setColor("RED");
			embed.setTimestamp(new Date());
			embed.setDescription("An unhandled exception occurred.");
			const content = (<Error>error).message as string;
			embed.addField("Message", content ?? JSON.stringify(error));
			interaction.followUp({
				embeds: [embed]
			});
		}
	}
	protected slashRun?(interaction: discord.CommandInteraction, context: sapphire.ChatInputCommand.RunContext): sapphire.Awaitable<unknown>
	protected menuRun?(interaction: discord.ContextMenuInteraction, context: sapphire.ContextMenuCommand.RunContext): sapphire.Awaitable<unknown>

	async chatInputRun(interaction: discord.CommandInteraction, context: sapphire.ChatInputCommand.RunContext) {
		let func: (interaction: discord.CommandInteraction, context: sapphire.ChatInputCommand.RunContext) => sapphire.Awaitable<unknown>;
		let x;
		if (!this.slashRun) {
			if (!this.subcommands) return;
			const name = interaction.options.getSubcommand(true);
			const cmd = this.subcommands.find(i => name === i.name);
			if (cmd === undefined) throw new Error(`Subcommand for "${name}" not found.`);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			func = (this as any)[cmd.handlerName];
		} else func = this.slashRun;
		try {
			x = func.bind(this)(interaction, context);
		} catch (error) {
			this.slashHandler(error, interaction, context);
		}
		if (!(x instanceof Promise)) return;
		x.catch(e => {
			this.slashHandler(e, interaction, context);
		});

	}
}