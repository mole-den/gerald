import * as sapphire from "@sapphire/framework";
import * as discord from "discord.js";
import _ from "lodash";
import { PaginatedMessageEmbedFields } from "@sapphire/discord.js-utilities";
import { bot } from "../index";
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
		await interaction.deferReply();
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
			if (msg.content.length > 1028) content = msg.content.substring(0, 1025) + "...";
			else content = msg.content;
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
	name: "invite",
	description: "Shows invite link"
})
export class inviteCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name).setDescription(this.description);
		});
	}
	public override async slashRun(interaction: sapphire.ChatInputCommand.Interaction) {
		interaction.reply("Invite is: https://discord.com/oauth2/authorize?client_id=671156130483011605&permissions=8&scope=bot%20applications.commands");
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
	public override async slashRun(interaction: sapphire.ChatInputCommand.Interaction) {
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
		return interaction.reply({
			embeds: [embed]
		});
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
	public async slashRun(interaction: sapphire.ChatInputCommand.Interaction) {
		const x = interaction.options.get("command");
		if (x === null || x.value === undefined) return this.baseHelp(interaction);
		const cmd = bot.stores.get("commands").find(c => c.name === x.value);
		if (!cmd) return interaction.followUp({
			content: "Specify a valid command.",
			ephemeral: true
		});
		interaction.reply({ embeds: [this.cmdHelp(cmd)] });
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
		if (cmd.detailedDescription)
			if (typeof cmd.detailedDescription === "string")
				embed.addField("Usage:", (cmd.detailedDescription), false);
			else
				Object.keys(cmd.detailedDescription).forEach(c => {
					// @ts-expect-error eee
					embed.addField(`${c}:`, cmd?.detailedDescription[c]);
				});
		else embed.addField("Usage:", "null", false);
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

	public async slashRun(interaction: discord.CommandInteraction) {
		const user = interaction.options.getUser("user") ?? interaction.user;
		if (user.bot) return interaction.reply("Bots do not earn xp");
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

		return interaction.reply(`${user.username} is level ${x.level} and has ${x.xp}/${x.nextLevelXp}xp`);
	}
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

@ApplyOptions<geraldCommandOptions>({
	name: "warframe",
	description: "Command to access warframe APIs.",
	subcommands: [{ handlerName: "cmdMarket", name: "market" },
		{ handlerName: "cmdRelics", name: "relics", }]
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
								.addChoices([["Lith", "Lith"], ["Meso", "Meso"], ["Neo", "Neo"], ["Axi", "Axi"], ["Requiem", "Requiem"]])
						).addStringOption(o =>
							o.setName("name").setDescription("The name of the relic.").setRequired(true)
						).addStringOption(o => {
							return o.setName("platform").setDescription("Return data for specified platform. Default: pc").setRequired(false);
						})
				);
		}, {
			idHints: ["957171251271585822"],
			behaviorWhenNotIdentical: sapphire.RegisterBehavior.Overwrite
		});
	}

	public async slashRun() {
		return;
	}

	public async cmdMarket(interaction: discord.CommandInteraction) {
		await interaction.deferReply();
		let itemToGet = interaction.options.getString("item");
		if (!itemToGet) return;
		itemToGet = itemToGet.replace(/([^a-z])/gmi, "_").toLowerCase();
		const data = await axios.get(`https://api.warframe.market/v1/items/${itemToGet}/orders?include=item`, {
			responseType: "json",
			headers: {
				"Platform": (interaction.options.getString("platform") ?? "pc")
			}
		});
		if (data.status === 404) {
			interaction.editReply(`404: Item \`${itemToGet}\` not found.`);
			return;
		}
		if (data.status !== 200) {
			interaction.editReply(`${data.status}: ${data.statusText}`);
			return;
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
					.setURL(`https://warframe.market/items/${itemToGet}`)
					.setStyle("LINK"),
			).addComponents(utils.dismissButton);
		const embed = new discord.MessageEmbed()
			.setTitle(`Market information for ${itemToGet} on ${(interaction.options.getString("platform") ?? "pc")}`)
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

	public async cmdRelics(interaction: discord.CommandInteraction) {
		await interaction.deferReply();
		interface relicReward {
			_id: string,
			itemName: string,
			rarity: string,
			chance: number
		}
		const platform = interaction.options.getString("platform") ?? "pc";
		const relicType = interaction.options.getString("type");
		const relicName = interaction.options.getString("name");
		function getRarity(value: number): string {
			switch (value) {
			case 25.33:
				return "Common";
			case 11:
				return "Uncommon";
			case 2:
				return "Rare";
			}
			return "Unknown";
		}
		if (!relicName || !relicType) return;
		const x = await axios.get(`http://drops.warframestat.us/data/relics/${relicType}/${relicName}.json`);
		if (x.status !== 200) return interaction.editReply({
			content: `Relic \`${relicType} ${relicName}\` not found.`,
		});
		const rewards: relicReward[] = x.data.rewards.Intact;
		let data: relicData[] = [];
		for (const i of rewards) {
			const itemName = i.itemName;
			if (itemName.includes("Forma") || itemName.includes("Kuva")
				|| itemName.includes("Riven Sliver") || itemName.includes("Exilus")) {
				data.push({
					name: i.itemName,
					rarity: getRarity(i.chance),
					price: -1,
					lowestPrice: -1,
					orders: -1,
					link: "NA",
					meta: i,
				});
				continue;
			} else {
				let urlName = i.itemName.toLowerCase().split(" ").filter(v => v !== "blueprint").join("_");
				let resolvedItem: {
					payload: {
						orders: order[]
					},
					include: {
						item: {
							items_in_set: {
								url_name: string,
								en: {
									item_name: string
								}
							}[]
						}
					}
				};
				const item = await (axios.get(`https://api.warframe.market/v1/items/${urlName}/orders?include=item`, {
					headers: {
						Platform: platform
					}
				}));
				if (item.status === 200) resolvedItem = item.data;
				else {
					urlName = `${(<RegExpMatchArray>item.data.error.substring(0, item.data.error.length - 26).match(/[a-z_]+$/))[0]}_blueprint`;
					resolvedItem = (await axios.get(`https://api.warframe.market/v1/items/${urlName}/orders?include=item`)).data;
				}
				const prices = resolvedItem.payload.orders.filter(o => o.order_type !== "buy" && o.user.status !== "offline").sort((a, b) => a.platinum - b.platinum).slice(0, 9).map(o => o.platinum);
				data.push({
					name: i.itemName,
					rarity: getRarity(i.chance),
					lowestPrice: prices[0],
					price: Math.round(_.mean(prices)),
					orders: resolvedItem.payload.orders.length,
					link: `https://warframe.market/items/${urlName}`,
					meta: i,
				});

			}

		}
		type relicData = {
			name: string;
			price: number;
			orders: number;
			link: string;
			rarity: string;
			lowestPrice: number;
			meta: any;
		};
		const embed = new discord.MessageEmbed();
		embed.setTitle(`Market data for ${relicType} ${relicName}`);
		embed.setColor("BLURPLE");
		embed.setTimestamp(new Date());
		// sort data by rarity
		data = data.sort((a, b) => {
			if (a.rarity === b.rarity) return 0;
			if (a.rarity === "Common") return -1;
			if (a.rarity === "Uncommon" && b.rarity === "Rare") return -1;
			if (a.rarity === "Rare") return 1;
			return a.rarity === "Common" ? -1 : 1;
		});
		for (const i of data)
			embed.addField(i.name, `Rarity: ${i.rarity}\nMean price: ${i.price === -1 ? "NA" : i.price + "p"}, Lowest price: ${i.lowestPrice === -1 ? "NA" : i.lowestPrice + "p"}\nTotal orders: ${i.orders}`);
		const row = new discord.MessageActionRow();
		row.addComponents(utils.dismissButton);
		await interaction.editReply({
			embeds: [embed],
			components: [row]
		});
		const response = await interaction.fetchReply();
		if (response instanceof discord.Message)
			utils.handleDismissButton(interaction, response);
		return;
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
		await interaction.deferReply();
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
		if (content.length === 1) content.push("All members have 0 xp.");
		await interaction.editReply({
			content: content.join("\n"),
			allowedMentions: { parse: [] }
		});
	}
}

@ApplyOptions<geraldCommandOptions>({
	name: "roll",
	description: "Roll dice.",
})
export class rollCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand(cmd => cmd.setDescription(this.description).setName(this.name)
			.addStringOption(i => i.setName("dice").setDescription("Amount and type of dice to roll.")),
		{ idHints: ["1001300165879152721"] });
	}

	public async slashRun(interaction: discord.CommandInteraction) {
		interaction;
		const input = interaction.options.getString("dice")?.trimStart().trimEnd() ?? "d6";
		let option = input;
		const hasAmount = option.match(/^-?[.\d]+/) ? true : false;
		const amount = Number((option.match(/^-?[.\d]+/) ?? ["1"])[0]);
		if (hasAmount) option = option.replace(/^-?[.\d]+/, "");
		if (option.startsWith("d")) option = option.substring(1);
		const dice = Number((option.match(/^-?[.\d]+/) ?? "6")[0]);
		option = option.substring(dice.toString().length);
		let add: number;
		const ps = option.includes("+") ? true : option.includes("-") ? true : false;
		if (!ps)
			add = 0;
		else
			add = Number(((option.match(/^\+[.\d]+|^-[.\d]+/) ?? ["0"])[0]));
		if (_.isNaN(add) || _.isNaN(dice) || _.isNaN(amount)) {
			await interaction.reply({
				ephemeral: true,
				content: `Invalid input: ${input}`
			});
			return;
		} 
		let result: number;
		const resultArray: number[] = [];
		for (let i = 0; i < amount; i++) {
			result = utils.getRandomArbitrary(1, dice);
			resultArray.push(result);
		}
		result = resultArray.reduce((a, b) => a + b, 0);
		result += add;
		const addString = `${add >= 0 ? "+" : "-"} ${Math.abs(add)}`;
		const resultArrString = `[${resultArray.join(", ")}]`;
		const relpy = `Rolled \`${input}\` and got ${result} ${add !== 0 || resultArray.length > 1 ? "(" : ""}${resultArray.length > 1 || add !== 0 ? resultArrString : ""} ${add !== 0 ? addString : ""}`;
		await interaction.reply({
			content: `${relpy.trimEnd()}${add !== 0 || resultArray.length > 1 ? ")" : ""}`,
		});
		return;
	}
}

@ApplyOptions<geraldCommandOptions>({
	name: "dev",
	description: "Developer commands",
	subcommands: [{ handlerName: "cmdEval", name: "eval" },
		{ handlerName: "cmdQuery", name: "query", }]
}) export class devCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand(builder => {
			return builder.setName(this.name)
				.setDescription(this.description)
				.addSubcommand(subcommand =>
					subcommand.setName("eval").setDescription("Eval JS").addStringOption(o => o.setName("string").setDescription("string to eval").setRequired(true))
				).addSubcommand(subcommand =>
					subcommand.setName("query").setDescription("Query database").addStringOption(o => o.setName("query").setDescription("Query to execute").setRequired(true)));

		});
	}

	public async slashRun() {
		return;
	}

	public async cmdQuery(interaction: discord.CommandInteraction) {
		if (!process.env.OWNERS?.split(" ").includes(interaction.user.id)) return interaction.reply({
			ephemeral: true,
			content: "Not authorized"
		});
		const str = interaction.options.getString("query") as string;
		let query: unknown;
		if (str.toLowerCase().startsWith("select"))
			query = await bot.db.$queryRawUnsafe(str);
		else
			query = await bot.db.$executeRawUnsafe(str);

		if (str.toLowerCase().startsWith("select")) return interaction.reply({
			content: JSON.stringify(query),
			allowedMentions: {
				parse: []
			}
		});
		else return interaction.reply({
			content: `${(query as number)} rows affected`,
			allowedMentions: {
				parse: []
			}
		});
	}

	public async cmdEval(interaction: discord.CommandInteraction) {
		if (!process.env.OWNERS?.split(" ").includes(interaction.user.id)) return interaction.reply({
			ephemeral: true,
			content: "Not authorized"
		});
		const str = interaction.options.getString("string") as string;
		const x = eval(str);
		return interaction.reply({
			content: `${x}`,
			allowedMentions: {
				parse: []
			}
		});
	}
}
