import * as sapphire from "@sapphire/framework";
import * as discord from "discord.js";
import _ from "lodash";
import { bot } from "../index";
import { GeraldCommand, GeraldCommandOptions } from "../commandClass";
import { ApplyOptions } from "@sapphire/decorators";
import axios from "axios";
import { utils } from "../utils";
import { deleted_msg } from "@prisma/client";
axios.defaults.validateStatus = () => true;
///<reference types="../index"/>
type attachment = {
	url: string,
	name: string | null
}[];


@ApplyOptions<GeraldCommandOptions>({
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
				.setDescription(this.description).
				addIntegerOption(i => i.setName("amount")
					.setDescription("Amount of messages to get").setMinValue(1).setMaxValue(5).setRequired(true))
				.addUserOption(u => u.setName("user").setDescription("Filter by user").setRequired(false))
				.addChannelOption(c => c.setName("channel").setDescription("Filter by channel").setRequired(false));
		}, {
			behaviorWhenNotIdentical: sapphire.RegisterBehavior.Overwrite,
			idHints: ["1006068634256408586"]
		});
	}
	public override async chatInputRun(interaction: discord.CommandInteraction, context: sapphire.ChatInputCommandContext) {
		try {
			if (!interaction.guild) return;
			const user = interaction.options.getUser("user");
			const channel = interaction.options.getChannel("channel");
			if (channel && channel.type !== "GUILD_TEXT" && channel.type !== "GUILD_NEWS") {
				if (channel.type === "GUILD_NEWS_THREAD" || channel.type === "GUILD_PUBLIC_THREAD" || channel.type === "GUILD_PRIVATE_THREAD")
					return interaction.reply({
						ephemeral: true,
						content: "Messages in threads are not recorded"
					});
				return interaction.reply({
					ephemeral: true,
					content: `The channel \`${channel.name}\` is not a valid text channel.`
				});
			}
			const amount = interaction.options.getInteger("amount") ?? 3;
			await interaction.deferReply();
			const where: {
				guildId: string,
				author?: string,
				channel?: string
			} = {
				guildId: interaction.guild.id,
			};
			if (user) where.author = user.id;
			if (channel) where.channel = channel.id;
			const total = await bot.db.deleted_msg.count({
				where
			});
			const del = await bot.db.deleted_msg.findMany({
				where,
				orderBy: {
					msgTime: "desc"
				},
				take: amount
			});
			let filterMsg: string | null = null;
			if (user && channel) filterMsg = `Filtering by user ${user} and channel ${channel}`;
			else if (channel) filterMsg = `Filtering by channel ${channel}`;
			else if (user) filterMsg = `Filtering by user ${user}`;
			const embeds: discord.MessageEmbed[] = this.getEmbeds(del, user !== null, channel !== null);
			const advanceButton = new discord.MessageButton().setCustomId("del-next").setLabel("Next page").setStyle("PRIMARY");
			const backButton = new discord.MessageButton().setCustomId("del-back").setLabel("Previous page").setStyle("PRIMARY");
			const row = new discord.MessageActionRow();
			if (total < amount) advanceButton.setDisabled(true);
			backButton.setDisabled(true);
			row.addComponents(backButton, advanceButton, new utils.dismissButton());
			await interaction.editReply({
				embeds: embeds,
				components: [row],
				content: `Showing 1-${total < amount ? total : amount} of ${total} ${filterMsg ? "\n" + filterMsg : ""}`,
				allowedMentions: {
					parse: []
				}
			});
			let at = amount;
			const reply = await interaction.fetchReply() as discord.Message;
			// eslint-disable-next-line no-constant-condition
			while (true) {
				let x: discord.ButtonInteraction<discord.CacheType>;
				try {
					x = await reply.awaitMessageComponent({
						componentType: "BUTTON",
						filter: (button) => button.user.id === interaction.user.id,
						time: 15_000
					});
				} catch (error) {
					console.log(error);
					const advance = new discord.MessageButton().setCustomId("del-next").setLabel("Next page").setStyle("PRIMARY").setDisabled(true);
					const back = new discord.MessageButton().setCustomId("del-back").setLabel("Previous page").setStyle("PRIMARY").setDisabled(true);
					const remove = (new utils.dismissButton).setDisabled(true);
					const newRow = new discord.MessageActionRow();
					newRow.addComponents(back, advance, remove);
					interaction.editReply({
						components: [newRow],
						allowedMentions: {
							parse: []
						}
					});
					break;
				}
				x.deferUpdate();
				if (x.customId === "dismissEmbed") {
					interaction.deleteReply();
					break;
				} else if (x.customId === "del-next") {
					const query = await bot.db.deleted_msg.findMany({
						where,
						orderBy: {
							msgTime: "desc"
						},
						take: amount,
						skip: at
					});
					at = at + amount;
					const newEmbeds = this.getEmbeds(query, user !== null, channel !== null);
					const advance = new discord.MessageButton().setCustomId("del-next").setLabel("Next page").setStyle("PRIMARY");
					const back = new discord.MessageButton().setCustomId("del-back").setLabel("Previous page").setStyle("PRIMARY");
					const newRow = new discord.MessageActionRow();
					newRow.addComponents(back, advance, new utils.dismissButton());
					if (at >= total) advance.setDisabled(true);
					if (at - amount <= 0) back.setDisabled(true);
					interaction.editReply({
						embeds: newEmbeds,
						components: [newRow],
						content: `Showing ${at - amount}-${at >= total ? total : at} of ${total} ${filterMsg ? "\n" + filterMsg : ""}`,
						allowedMentions: {
							parse: []
						}
					});
				} else if (x.customId === "del-back") {
					at = at - amount;
					const query = await bot.db.deleted_msg.findMany({
						where,
						orderBy: {
							msgTime: "desc"
						},
						take: amount,
						skip: at
					});
					const newEmbeds = this.getEmbeds(query, user !== null, channel !== null);
					const advance = new discord.MessageButton().setCustomId("del-next").setLabel("Next page").setStyle("PRIMARY");
					const back = new discord.MessageButton().setCustomId("del-back").setLabel("Previous page").setStyle("PRIMARY");
					const newRow = new discord.MessageActionRow();
					newRow.addComponents(back, advance, new utils.dismissButton());
					if (at - amount <= 0) back.setDisabled(true);
					interaction.editReply({
						embeds: newEmbeds,
						components: [newRow],
						content: `Showing ${at - amount}-${at} of ${total} ${filterMsg ? "\n" + filterMsg : ""}`,
						allowedMentions: {
							parse: []
						}
					});
				}
			}
		} catch (error) {
			this.slashHandler(error, interaction, context);
		}

	}
	private getEmbeds(del: deleted_msg[], user: boolean, channel: boolean): discord.MessageEmbed[] {
		const embeds: discord.MessageEmbed[] = [];
		del.forEach((msg) => {
			const attachments = <attachment>msg.attachments;
			let msgContent: string;
			if (msg.content.length > 1028) msgContent = msg.content.substring(0, 1025) + "...";
			else msgContent = msg.content;
			const DeleteEmbed = new discord.MessageEmbed();
			if (user === false) DeleteEmbed.addField("Author", `<@${msg.author}>`, true);
			if (channel === false) DeleteEmbed.addField("Channel", `<#${msg.channel}>`, true);
			DeleteEmbed
				.setTitle("Deleted Message")
				.setColor("#fc3c3c")
				.addField("Deleted By", msg.deletedBy, true)
				.addField("Message", msgContent || "None");
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
		return embeds;
	}
}

@ApplyOptions<GeraldCommandOptions>({
	name: "invite",
	description: "Shows invite link"
})
export class inviteCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name).setDescription(this.description);
		}, {
			idHints: ["1006068635669897277"]
		});
	}
	public override async chatInputRun(interaction: discord.CommandInteraction) {
		interaction.reply("Invite is: https://discord.com/oauth2/authorize?client_id=671156130483011605&permissions=8&scope=bot%20applications.commands");
	}
}
@ApplyOptions<GeraldCommandOptions>({
	name: "info",
	description: "Shows general information about the bot",
})
export class infoCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name)
				.setDescription(this.description);
		}, {
			idHints: ["1006068637087571978"]
		});
	}
	public override async chatInputRun(interaction: discord.CommandInteraction, context: sapphire.ChatInputCommandContext) {
		try {
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
		} catch (error) {
			this.slashHandler(error, interaction, context);
		}

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

@ApplyOptions<GeraldCommandOptions>({
	name: "warframe",
	description: "Command to access warframe APIs.",
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
			behaviorWhenNotIdentical: sapphire.RegisterBehavior.Overwrite,
			idHints: ["1006068638610096250"]
		});
	}

	public async market(interaction: discord.CommandInteraction) {
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
				components: [new discord.MessageActionRow().addComponents(new utils.dismissButton())]
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
			).addComponents(new utils.dismissButton());
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

	public async relics(interaction: discord.CommandInteraction) {
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
		row.addComponents(new utils.dismissButton());
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

@ApplyOptions<GeraldCommandOptions>({
	name: "roll",
	description: "Roll dice.",
})
export class rollCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand(cmd => cmd.setDescription(this.description).setName(this.name)
			.addStringOption(i => i.setName("dice").setDescription("Amount and type of dice to roll.")),
		{ idHints: ["1006068640082309201"] });
	}

	public override async chatInputRun(interaction: discord.CommandInteraction, context: sapphire.ChatInputCommandContext) {
		try {
			const input = interaction.options.getString("dice")?.trimStart().trimEnd() ?? "d6";
			let option = input;
			const hasAmount = option.match(/^-?[.\d]+/) ? true : false;
			const amount = Number((option.match(/^-?[.\d]+/) ?? ["1"])[0]);
			if (amount > 5000) return interaction.reply({
				ephemeral: true,
				content: "You can't roll more than 5000 dice at once."
			});
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
		} catch (error) {
			this.slashHandler(error, interaction, context);
		}
	}
}

@ApplyOptions<GeraldCommandOptions>({
	name: "dev",
	description: "Developer commands",
	preconditions: ["OwnerOnly"]
}) export class devCommand extends GeraldCommand {
	public override registerApplicationCommands(reg: sapphire.ApplicationCommandRegistry) {
		reg.registerChatInputCommand(builder => {
			return builder.setName(this.name)
				.setDescription(this.description)
				.addSubcommand(subcommand =>
					subcommand.setName("eval").setDescription("Eval JS").addStringOption(o => o.setName("string").setDescription("string to eval").setRequired(true))
				).addSubcommand(subcommand =>
					subcommand.setName("query").setDescription("Query database").addStringOption(o => o.setName("query").setDescription("Query to execute").setRequired(true)));

		}, { idHints: ["1006068721787359243"] });
	}

	public async query(interaction: discord.CommandInteraction) {
		if (!process.env.OWNERS?.split(" ").includes(interaction.user.id)) return interaction.reply({
			ephemeral: true,
			content: "Not authorized"
		});
		const str = interaction.options.getString("query") as string;
		let query: unknown;
		if (str.startsWith("SELECT"))
			query = await bot.db.$queryRawUnsafe(str);
		else
			query = await bot.db.$executeRawUnsafe(str);

		if (str.startsWith("SELECT")) return interaction.reply({
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

	public async eval(interaction: discord.CommandInteraction) {
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
