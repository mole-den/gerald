import * as sapphire from "@sapphire/framework";
import * as discord from "discord.js";
import _ from "lodash";
import { PaginatedMessageEmbedFields } from "@sapphire/discord.js-utilities";
import { getRandomArbitrary, bot } from "../index";
import { GeraldCommand, geraldCommandOptions } from "../commandClass";
import { ApplyOptions } from "@sapphire/decorators";
import * as time from "@sapphire/time-utilities";
import axios from "axios";
import { utils } from "../utils";
axios.defaults.validateStatus = () => true;
///<reference types="../index"/>
time;


@ApplyOptions<geraldCommandOptions>({
	name: "deleted",
	description: "Shows infomation about the last deleted messages",
	requiredClientPermissions: [],
	requiredUserPermissions: "MANAGE_MESSAGES",
	preconditions: ["GuildOnly"],
	options: ["id"]
})
export class DeletedMSGCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name)
				.setDescription(this.description).addIntegerOption(i => i.setName("amount")
					.setDescription("Amount of messages to get").setMinValue(1).setMaxValue(5).setRequired(true));
		}, {
			behaviorWhenNotIdentical: sapphire.RegisterBehavior.Overwrite
		});
	}
	public async slashRun(interaction: discord.CommandInteraction) {
		type attachment = {
			url: string,
			name: string | null
		}[];
		if (!interaction.guild) return;
		const amount = interaction.options.getInteger("amount");
		if (!amount) return;
		const del = await bot.db.deleted_msg.findMany({
			where: {
				guildId: interaction.guild.id
			},
			orderBy: {
				msgTime: "desc"
			},
			take: amount
		});
		const embeds: discord.MessageEmbed[] = [];
		del.forEach(async (msg) => {
			const attachments = <attachment>msg.attachments;
			let content: string;
			if (msg.content.length > 1028) {
				content = msg.content.substring(0, 1025) + "...";
			} else {
				content = msg.content;
			}
			const DeleteEmbed = new discord.MessageEmbed()
				.setTitle("Deleted Message")
				.setColor("#fc3c3c")
				.addField("Author", `<@${msg.author}>`, true)
				.addField("Deleted By", msg.deletedBy, true)
				.addField("Channel", `<#${msg.channel}>`, true)
				.addField("Message", content || "None");
			DeleteEmbed.footer = {
				text: `ID: ${msg.id} | Message ID: ${msg.msgId}\nAuthor ID: ${msg.author}`
			};
			if (attachments.length > 0) {
				const attachArray: string[] = [];
				(attachments).forEach((attach) => {
					attachArray.push(attach.name ? `[${attach.name}](${attach.url})` : `${attach.url}`);
				});
				DeleteEmbed.addField("Attachments", attachArray.join("\n"));
			}
			embeds.push(DeleteEmbed);
		});
		interaction.editReply({
			embeds: embeds
		});
	}

}


@ApplyOptions<geraldCommandOptions>({
	name: "prefix",
	fullCategory: ["_enabled"],
	description: "Shows and allows configuration of the bot prefix",
	requiredClientPermissions: [],
	requiredUserPermissions: [],
	preconditions: ["GuildOnly"]
})
export class prefixCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name)
				.setDescription(this.description)
				.addStringOption(i => i.setName("prefix")
					.setDescription("New bot prefix.").setAutocomplete(false).setRequired(false));
		}, {
			idHints: ["955744435654787082"]
		});
	}
	public override async slashRun(interaction: sapphire.ChatInputCommand.Interaction) {
		const x = interaction.options.get("prefix");
		this.baseRun((x?.value as string) ?? null, interaction);
	}
	public async chatRun(message: discord.Message, args: sapphire.Args) {
		const x = args.nextMaybe();
		this.baseRun(x.value ?? null, message);
	}
	private async baseRun(x: string | null, item: discord.Message | discord.CommandInteraction) {
		function send(msg: string) {
			if (item instanceof discord.Message) {
				item.channel.send(msg);
			} else {
				item.reply({
					content: msg
				});
			}
		}
		if (!item.guild) return;
		if (!x) {
			const prefix = await bot.db.guild.findUnique({
				where: {
					guildId: item.guild.id
				},
				select: { prefix: true }
			});
			if (!prefix) return;
			send(`The prefix for this server is \`${prefix.prefix}\``);
			return;
		}
		if (item instanceof discord.CommandInteraction) {
			if (!item.memberPermissions) return send("Failed to resolve user permissions.");
			if (!item.memberPermissions.has("ADMINISTRATOR"))
				return send("You are missing the following permissions to run this command: Administrator");
		} else {
			if (!item.member) return;
			if (!item.member.permissions.has("ADMINISTRATOR"))
				return send("You are missing the following permissions to run this command: Administrator");
		}
		bot.db.guild.update({
			where: {
				guildId: item.guild.id
			},
			data: {
				prefix: x
			}
		});
		return send(`Changed prefix for ${item.guild.name} to \`${x}\``);

	}
}

@ApplyOptions<geraldCommandOptions>({
	name: "invite",
	description: "Shows invite link"
})
export class inviteCommand extends GeraldCommand {
	public async chatRun(message: discord.Message) {
		message.channel.send("Invite is: https://discord.com/oauth2/authorize?client_id=671156130483011605&permissions=8&scope=bot%20applications.commands");
	}
}
@ApplyOptions<geraldCommandOptions>({
	name: "info",
	description: "Shows general information about the bot",
})
export class infoCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name)
				.setDescription(this.description);
		});
	}
	public override async chatRun(message: discord.Message) {
		message.channel.send({
			embeds: [await this.execute()]
		});
	}
	public override async slashRun(interaction: sapphire.ChatInputCommand.Interaction) {
		return interaction.editReply({
			embeds: [await this.execute()]
		});
	}
	private async execute() {
		let uptime = process.uptime();
		let uptimeString = "";
		if (uptime >= 86400) {
			uptimeString += Math.floor(uptime / 86400) + " days ";
			uptime %= 86400;
		}
		if (uptime >= 3600) {
			uptimeString += Math.floor(uptime / 3600) + " hours ";
			uptime %= 3600;
		}
		if (uptime >= 60) {
			uptimeString += Math.floor(uptime / 60) + " minutes ";
			uptime %= 60;
		}
		uptimeString += Math.floor(uptime) + " seconds";
		const start = Date.now();
		await bot.db.$queryRawUnsafe("SELECT 1;");
		const elapsed = Date.now() - start;
		const embed = new discord.MessageEmbed().setColor("BLURPLE");
		embed.setTitle("Info")
			.addField("Github repo", "https://github.com/mole-den/Gerald")
			.addField("Uptime", uptimeString)
			.addField("Discord API heartbeat", `${bot.ws.ping}ms`, false)
			.addField("Database Heartbeat", `${elapsed}ms`, false)
			.addField("Memory usage", `${Math.round(process.memoryUsage.rss() / 1000000)}MB `);
		return embed;
	}
}

@ApplyOptions<geraldCommandOptions>({
	name: "help",
	description: "Shows infomation about commands"
}) export class helpCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name)
				.setDescription(this.description)
				.addStringOption(i => i.setName("command")
					.setDescription("The command to get help for").setAutocomplete(false).setRequired(false));
		});
	}
	public async chatRun(message: discord.Message, args: sapphire.Args) {
		const maybe = args.nextMaybe();
		if (!maybe.exists) return this.baseHelp(message);
		const command = maybe.value;
		const cmd = bot.stores.get("commands").find(cmd => (cmd.name === command || cmd.aliases.includes(command)) && !cmd.fullCategory.includes("_hidden"));
		if (!cmd) return message.channel.send(`Command \`${command}\` not found`);
		return message.channel.send({ embeds: [this.cmdHelp(cmd)] });
	}

	public async slashRun(interaction: sapphire.ChatInputCommand.Interaction) {
		const x = interaction.options.get("command");
		if (x === null || x.value === undefined) return this.baseHelp(interaction);
		const cmd = bot.stores.get("commands").find(cmd => cmd.name === x.value);
		if (!cmd) return interaction.followUp({
			content: "Specify a valid command.",
			ephemeral: true
		});
		interaction.editReply({ embeds: [this.cmdHelp(cmd)] });
	}
	private cmdHelp(cmd: sapphire.Command) {
		const embed = new discord.MessageEmbed()
			.setColor("#0099ff")
			.setTitle(`Help for **${cmd.name}**`);
		if (cmd.aliases.length > 0)
			embed.addField("Command aliases:", cmd.aliases.join(", "), false);
		else
			embed.addField("Command aliases:", "None", false);
		if (cmd.description)
			embed.addField("Description:", cmd.description, false);
		else
			embed.addField("Description:", "null", false);
		if (cmd.detailedDescription) {
			if (typeof cmd.detailedDescription === "string")
				embed.addField("Usage:", (cmd.detailedDescription), false);
			else {
				Object.keys(cmd.detailedDescription).forEach(c => {
					// @ts-expect-error eee
					embed.addField(`${c}:`, cmd?.detailedDescription[c]);
				});
			}
		}
		else
			embed.addField("Usage:", "null", false);
		return embed;
	}

	private baseHelp(message: discord.Message | sapphire.ChatInputCommand.Interaction) {
		const items: discord.EmbedFieldData[] = bot.stores.get("commands").filter(cmd => cmd.fullCategory.includes("_hidden") === false).map((x) => {
			const aliases = x.aliases.length > 0 ? `(aliases: ${x.aliases.join(", ")})` : "";
			return {
				name: `${x.name} ${aliases}`,
				value: x.description,
				inline: false
			};
		});
		const response = new PaginatedMessageEmbedFields();
		response.setTemplate({ title: "Help", color: "#0099ff", footer: { text: "Use `help <command>` to get more information on a command" } })
			.setItems(items)
			.setItemsPerPage(5)
			.make()
			.run(message);
		return;
	}
}

@ApplyOptions<geraldCommandOptions>({
	name: "ask",
	description: "Ask a question and get a response",
	options: ["user"]
}) export class askCommand extends GeraldCommand {
	public async chatRun(message: discord.Message, args: sapphire.Args) {
		const opt = args.nextMaybe();
		if (opt.exists && opt.value === "user") {
			let i = await message.guild?.roles.fetch("915746575689588827");
			i ??= await message.guild?.roles.fetch("858473576335540224");
			if (!i) return;
			const member: string[] = [];
			i.members.each((mem) => member.push(mem.user.username));
			member.push("nobody");
			const uniq = [...new Set(member)];
			const ask = uniq[getRandomArbitrary(0, member.length - 1)];
			return await message.channel.send(`${ask}`);
		}
		else if (opt.exists && opt.value === "percent") {
			message.channel.send(`${getRandomArbitrary(0, 100)}%`);
			return;
		}
		if (getRandomArbitrary(0, 20) > 9) {
			return message.channel.send("yes");
		} else {
			return message.channel.send("no");
		}

	}
}

@ApplyOptions<geraldCommandOptions>({
	name: "level",
	description: "Shows the level of a user.",
	preconditions: ["GuildOnly"],
	fullCategory: ["levelling"]

}) export class viewLevelCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name)
				.setDescription(this.description)
				.addUserOption(i => i.setName("user")
					.setDescription("Get a specific members level.").setRequired(false));
		});
	}
	public async chatRun(message: discord.Message, args: sapphire.Args) {
		const user = await args.pick("member").catch(() => {
			return message.member;
		});
		if (!user) return;
		if (user.user.bot) return message.channel.send("Bots do not earn xp");
		if (!message.guild) return;
		let x = (await bot.db.member_level.findUnique({
			where: {
				memberID_guildID: {
					memberID: user.id,
					guildID: message.guild.id
				}
			}
		}));
		if (x === null) x = await bot.db.member_level.create({
			data: {
				memberID: user.id,
				guildID: message.guild.id,
			}
		});
		return message.channel.send(`${user.user.username} is level ${x.level} and has ${x.xp}/${x.nextLevelXp}xp`);
	}

	public async slashRun(interaction: discord.CommandInteraction) {
		const user = interaction.options.getUser("user") ?? interaction.user;
		if (user.bot) return interaction.editReply("Bots do not earn xp");
		if (!interaction.guild) return;
		let x = (await bot.db.member_level.findUnique({
			where: {
				memberID_guildID: {
					memberID: user.id,
					guildID: interaction.guild.id
				}
			}
		}));
		if (x === null) x = await bot.db.member_level.create({
			data: {
				memberID: user.id,
				guildID: interaction.guild.id,
			}
		});

		return interaction.editReply(`${user.username} is level ${x.level} and has ${x.xp}/${x.nextLevelXp}xp`);
	}
}

@ApplyOptions<geraldCommandOptions>({
	name: "warframe",
	description: "Command to access warframe APIs.",
	subcommands: [{ handlerName: "cmdMarket", name: "market", slashCommand: true },
		{ handlerName: "cmdRelics", name: "relics", slashCommand: true }]
}) export class warframeCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name)
				.setDescription(this.description)
				.addSubcommand(subcommand =>
					subcommand
						.setName("market")
						.setDescription("Access the warframe.market API")
						.addStringOption(option => option.setName("item").setDescription("The item to get information about").setRequired(true))
						.addStringOption(option => option.addChoices([["xbox", "xbox"], ["pc", "pc"], ["ps4", "ps4"], ["switch", "switch"]])
							.setRequired(false).setDescription("Return data for specified platform. Default: pc").setName("platform")))
				.addSubcommand(subcommand =>
					subcommand.setName("relics")
						.setDescription("Get data and price information about relics and their content.")
						.addStringOption(o =>
							o.setName("type").setDescription("The type of the relic.").setRequired(true)
								.addChoices([["Lith", "lith"], ["Meso", "meso"], ["Neo", "neo"], ["Axi", "axi"], ["Requiem", "requiem"]])
						).addStringOption(o =>
							o.setName("name").setDescription("The name of the relic.").setRequired(true)
						)
				);
		}, {
			idHints: ["957171251271585822"],
			behaviorWhenNotIdentical: sapphire.RegisterBehavior.Overwrite
		});
	}
	public async cmdMarket(interaction: discord.CommandInteraction) {
		let item = interaction.options.getString("item");
		if (!item) return;
		item = item.replace(/([^a-z])/gmi, "_").toLowerCase();
		const data = await axios.get(`https://api.warframe.market/v1/items/${item}/orders?include=item`, {
			responseType: "json",
			headers: {
				"Platform": (interaction.options.getString("platform") ?? "pc")
			}
		});
		if (data.status === 404) {
			interaction.editReply(`404: Item \`${item}\` not found.`);
			return;
		}
		if (data.status !== 200) {
			interaction.editReply(`${data.status}: ${data.statusText}`);
			return;
		}
		interface order {
			quantity: number,
			platinum: number,
			order_type: "sell" | "buy",
			user: {
				reputation: number,
				region: string,
				last_seen: string,
				ingame_name: string,
				id: string,
				avatar: null | string,
				status: string
			},
			platform: string,
			region: string,
			creation_date: string,
			last_update: string,
			visible: boolean,
			id: string
		}
		let orders: order[] = data.data.payload.orders;
		orders = orders.filter(v => {
			return v.order_type === "sell" && v.quantity === 1;
		});
		const prices: number[] = [];
		orders.forEach(x => {
			prices.push(x.platinum);
		});
		const mean = Math.round(_.mean(prices));
		if (isNaN(mean)) {
			const item = interaction.options.getString("item");
			const embed = new discord.MessageEmbed()
				.setTitle(`Market information for "${item}" on ${(interaction.options.getString("platform") ?? "pc")}`)
				.setColor("BLURPLE")
				.setTimestamp(new Date())
				.addField("No sell orders", `Item "${item}" has 0 sell orders.`);
			await interaction.editReply({
				embeds: [embed],
				components: [new discord.MessageActionRow().addComponents(utils.dismissButton)]
			});
			const response = await interaction.fetchReply();
			if (response instanceof discord.Message) utils.handleDismissButton(interaction, response);
			return;
		}
		const min = Math.min(...prices);
		const max = Math.max(...prices);
		const totalOrders = orders.length;
		const row = new discord.MessageActionRow()
			.addComponents(
				new discord.MessageButton()
					.setLabel("Market listing")
					.setURL(`https://warframe.market/items/${item}`)
					.setStyle("LINK"),
			).addComponents(utils.dismissButton);
		const embed = new discord.MessageEmbed()
			.setTitle(`Market information for ${item} on ${(interaction.options.getString("platform") ?? "pc")}`)
			.setColor("BLURPLE")
			.setTimestamp(new Date())
			.addField("Price information", `Highest price: ${max}p\nLowest price: ${min}p\nMean price: ${mean}p\nTotal sell orders: ${totalOrders}`);
		await interaction.editReply({
			embeds: [embed],
			components: [row]
		});
		const response = await interaction.fetchReply();
		if (response instanceof discord.Message)
			utils.handleDismissButton(interaction, response);
	}

	public async cmdRelics(interaction: discord.Interaction) {

	}
}

@ApplyOptions<geraldCommandOptions>({
	name: "query",
	fullCategory: ["_enabled", "_owner", "_hidden"],
	description: "Runs SQL input against database",
	requiredClientPermissions: [],
	preconditions: ["OwnerOnly"]
})
export class queryCommand extends GeraldCommand {
	public async chatRun(message: discord.Message, args: sapphire.Args) {
		const out = await args.restResult("string");
		if (!out.value) return;
		const data = await bot.db.$queryRawUnsafe(out.value);
		const JSONdata = JSON.stringify(data, null, 1);
		if (JSONdata?.length && JSONdata.length < 2000) {
			message.channel.send({
				allowedMentions: { parse: [] },
				content: JSONdata
			});
			return;
		} else if (JSONdata?.length && JSONdata.length > 2000) {
			const buffer = Buffer.from(JSONdata);
			const attachment = new discord.MessageAttachment(buffer, "file.json");
			message.channel.send({ files: [attachment] });
		}
	}

}


@ApplyOptions<geraldCommandOptions>({
	name: "leaderboard",
	description: "Shows the leaderboard for levelling.",
	preconditions: ["GuildOnly"],
	fullCategory: ["levelling"]
}) export class leaderBoardCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name).setDescription(this.description);
		});
	}
	public async slashRun(interaction: discord.CommandInteraction) {
		if (!interaction.guild) return;
		const top = await bot.db.member_level.findMany({
			where: {
				guildID: interaction.guild.id,
			},
			orderBy: {
				xp: "desc"
			},
			take: 10
		});
		let index = 0;
		const content = [`**Leaderboard for ${interaction.guild.name}**`];
		top.forEach(i => {
			if (index === 0) {
				content.push(`**1st:** <@${i.memberID}>: lvl${i.level}, ${i.xp}xp`);
				index++;
				return;
			} else if (index === 1) {
				content.push(`**2nd:** <@${i.memberID}>: lvl${i.level}, ${i.xp}xp`);
				index++;
				return;
			} else if (index === 2) {
				content.push(`**3rd:** <@${i.memberID}>: lvl${i.level}, ${i.xp}xp`);
				index++;
				return;
			}
			content.push(`**${index + 1}th:** <@${i.memberID}>: lvl${i.level}, ${i.xp}xp`);
			index++;
			return;
		});
		if (content.length === 1) {
			content.push("All members have 0 xp.");
		}
		interaction.editReply({
			content: content.join("\n"),
			allowedMentions: { parse: [] }
		});
	}
}

