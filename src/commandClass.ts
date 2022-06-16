import * as sapphire from "@sapphire/framework";
import * as discord from "discord.js";
import { bugsnag } from ".";

declare module "@sapphire/pieces" {
	interface Container {
		modules: Module[];
	}
}



export interface ModuleOptions {
	name: string,
	description: string,
	hidden?: boolean
}

export abstract class Module {
	description: string;
	name: string;
	hidden: boolean;
	constructor(options: ModuleOptions) {
		this.hidden = options.hidden ?? false;
		this.description = options.description;
		this.name = options.name;
	}

	abstract load(): Promise<void>
	abstract unload(): Promise<void>
}

interface Subcommand {
	name: string,
	handlerName: string,
	slashCommand?: boolean,
	messageCommand?: boolean
}
export interface geraldCommandOptions extends sapphire.CommandOptions {
	usage?: string,
	alwaysEnabled?: boolean,
	private?: boolean
	subcommands?: Subcommand[]
}

// declare class CommandStore extends sapphire.AliasStore<GeraldCommand> {
// 	constructor();
// 	get categories(): string[];
// 	unload(name: string | GeraldCommand): Promise<GeraldCommand>;
// 	loadAll(): Promise<void>;
// }

export abstract class GeraldCommand extends sapphire.Command {
	alwaysEnabled: boolean;
	private: boolean;
	subcommands: Subcommand[] | null;
	public constructor(context: sapphire.Command.Context, options: geraldCommandOptions) {
		super(context, {
			...options,
		});
		this.subcommands = options.subcommands ?? null;
		this.alwaysEnabled = options.alwaysEnabled ?? false;
		this.private = options.private ?? false;
	}
	private messageHandler(error: unknown, message: discord.Message, args: sapphire.Args, context: sapphire.MessageCommand.RunContext): void {
		const channel = message.channel;
		if (error instanceof sapphire.UserError) channel.send(error.message);
		else {
			args;
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
			channel.send({
				embeds: [embed]
			});
		}

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
	protected slashRun?(interaction: discord.CommandInteraction, reply: discord.Message, context: sapphire.ChatInputCommand.RunContext): sapphire.Awaitable<unknown>
	protected chatRun?(message: discord.Message, args: sapphire.Args, context: sapphire.MessageCommand.RunContext): sapphire.Awaitable<unknown>
	protected menuRun?(interaction: discord.ContextMenuInteraction, context: sapphire.ContextMenuCommand.RunContext): sapphire.Awaitable<unknown>

	async chatInputRun(interaction: discord.CommandInteraction, context: sapphire.ChatInputCommand.RunContext) {
		let func: (interaction: discord.CommandInteraction, reply: discord.Message, context: sapphire.ChatInputCommand.RunContext) => sapphire.Awaitable<unknown>;
		await interaction.deferReply();
		const reply = await interaction.fetchReply();
		let x;
		if (!this.slashRun) {
			if (!this.subcommands) return;
			if (!this.subcommands.some(i => i.slashCommand === true)) return;
			const name = interaction.options.getSubcommand(true);
			const cmd = this.subcommands.find(i => name === i.name);
			if (cmd === undefined) throw new Error(`Subcommand for "${name}" not found.`);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			func = (this as any)[cmd.handlerName];
		} else func = this.slashRun;
		try {
			x = func(interaction, <discord.Message>reply, context);
		} catch (error) {
			this.slashHandler(error, interaction, context);
		}
		if (!(x instanceof Promise)) return;
		x.catch(e => {
			this.slashHandler(e, interaction, context);
		});

	}
	messageRun(message: discord.Message, args: sapphire.Args, context: sapphire.MessageCommand.RunContext) {
		if (!this.chatRun) return;
		let x;
		try {
			x = this.chatRun(message, args, context);
		} catch (error) {
			this.messageHandler(error, message, args, context);
		}
		if (!(x instanceof Promise)) return;
		x.catch(e => {
			this.messageHandler(e, message, args, context);
		});

	}

}
/*
export class CommandManager extends Module {
	constructor() {
		super({
			name: "Command Management",
			description: "Allows management of commands",
			hidden: true,
			settings: [{
				id: "disabledInGuild",
				default: [],
			},
			{
				id: "channelDisabled",
				default: []
			},
			{
				id: "roleDisabled",
				default: []
			}]
		})
	}
	async load(): Promise<void> { }
	async unload(): Promise<void> { }
	async settingsHandler(interaction: discord.CommandInteraction) {
		let settings = await this.getSetting(interaction.guildId!)
		if (!settings) return
		let disabledInServer = <SettingGet<string[]>>settings.find(i => i.id === "disabledInGuild")
		let channelDisabled = <SettingGet<{ cmd: string, channel: string | string[] }[]>>settings.find(i => i.id === "channelDisabled")
		let roleDisabled = <SettingGet<{ cmd: string, role: string | string[] }[]>>settings.find(i => i.id === "roleDisabled")
		console.log(disabledInServer)
		console.log(channelDisabled)
		console.log(roleDisabled)
		let serverStr = (disabledInServer.value!.length === 0) ? "None" : disabledInServer.value!.join(", ")
		let channelStr = (channelDisabled.value!.length === 0) ? "None" : channelDisabled.value!.map(i => {
			return `${i}: Usage in ${typeof i.channel == "string" ? `<#${i.channel}>` : i.channel.map(i => `<#${i}>`).join(", ")} disabled.`
		}).join("\n")
		let roleStr = (roleDisabled.value!.length === 0) ? "None" : roleDisabled.value!.map(i => {
			return `${i}: Usage by ${typeof i.role == "string" ? `<@&${i.role}>` : i.role.map(i => `<@&${i}>`).join(", ")} disabled.`
		}).join("\n")
		let x = new discord.MessageEmbed()
		x.setTitle("Command management")
		x.setColor("BLURPLE")
		.setTimestamp(new Date())
		.addField(`Commands disabled in ${interaction.guild!.name}`, serverStr)
		.addField(`Commands blocked in channels`,  channelStr)
		.addField(`Command usage by roles disabled`, roleStr)
		let row1 = new discord.MessageActionRow().addComponents(new discord.MessageButton().setCustomId("addServer").setLabel("Disable module in server").setStyle("PRIMARY"),
		new discord.MessageButton().setCustomId("addChannel").setLabel("Disable command in channel").setStyle("PRIMARY"),
		new discord.MessageButton().setCustomId("addRole").setLabel("Disable command usage by role").setStyle("PRIMARY"),
		utils.dismissButton)
		let row2 = new discord.MessageActionRow().addComponents(new discord.MessageButton().setCustomId("rmServer").setLabel("Enable module in server").setStyle("PRIMARY"),
		new discord.MessageButton().setCustomId("rmChannel").setLabel("Enable command in channel").setStyle("PRIMARY"),
		new discord.MessageButton().setCustomId("rmRole").setLabel("Enable command usage by role").setStyle("PRIMARY"))
		await interaction.editReply({
			embeds: [x],
			components: [row1, row2]
		});
		let msg = <discord.Message>await interaction.fetchReply();
		let request: discord.Message;
		let commands = <CommandStore>bot.stores.get("commands")
		let modules = sapphire.container.modules.filter(x => x.hidden === false)
		await utils.buttonListener<void>({
			interaction: interaction,
			response: msg,
			onClick: async (i, next) => {
				if (i.customId.startsWith("add")) await disableItem(i)
				request = <discord.Message>await i.fetchReply()
				let category = await utils.awaitSelectMenu(interaction, <discord.Message>request)

				if (category) {
					console.log("here")
					console.log(category.values)
					next()
				}

			},
			onEnd() {
				(<discord.Message>request).delete()
				utils.disableButtons(msg)
			}
		})

		async function disableItem(i: discord.ButtonInteraction<discord.CacheType>) {
			let map = commands.filter(cmd => cmd.alwaysEnabled === false && cmd.private === false).map(i => {
				return {
					label: `Command: ${i.name}`,
					value: i.name,
					description: i.description
				};
			});
			await i.reply({
				content: `Select an item to disable`,
				components: [new discord.MessageActionRow()
					.addComponents(
						new discord.MessageSelectMenu()
							.setCustomId('select_category')
							.setPlaceholder('Nothing selected')
							.addOptions(i.customId.endsWith("Server") ? map.concat(modules.map(i => {
								return {
									label: `Module: ${i.name}`,
									value: i.name,
									description: i.description
								};
							})) : map)
					)]
			});
		}
	}

}*/