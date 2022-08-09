import * as discord from "discord.js";
import { ApplicationCommandRegistry, ChatInputCommandContext, RegisterBehavior } from "@sapphire/framework";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { bot } from "../index";
import { GeraldCommand, geraldCommandOptions, GeraldModule, GeraldModuleSetting } from "../commandClass";
import { ApplyOptions } from "@sapphire/decorators";
import { utils } from "../utils";
///<reference types="../index"/>
@ApplyOptions<geraldCommandOptions>({
	name: "levelling",
	description: "A basic server xp and levelling system.",
	requiredClientPermissions: [],
	preconditions: ["GuildOnly"],
}) export class levellingCommand extends GeraldCommand implements GeraldModule {
	xpLimit: RateLimiterMemory | undefined;
	ignore: string[] = [];
	settings: GeraldModuleSetting[] = [{
		id: "levelUpMsg",
		name: "levelupmessage",
		description: "Message sent when a user levels up. Use `{{user}}` to mention the user and `{{level}}` to get the user's new level.",
		default: "{{user}} is now level {{level}}.",
		type: "string",
		multiple: false
	}, {
		id: "earnVcXp",
		name: "vcxp",
		default: "true",
		type: "boolean",
		description: "Earn xp from talking in voice channels and streaming.",
		multiple: false
	}, {
		id: "ignoreChannels",
		name: "ignorechannels",
		type: "channel",
		default: "",
		description: "List of channels to not earn xp from.",
		multiple: true
	}];
	public override registerApplicationCommands(reg: ApplicationCommandRegistry) {
		reg.registerChatInputCommand((cmd) => {
			return cmd.setName(this.name)
				.setDescription(this.description).addSubcommandGroup(x => {
					x.setName("settings").setDescription("Settings for levelling.");
					this.settings.forEach(s => {
						x.addSubcommand(builder => {
							builder.setName(s.name).setDescription(s.description);
							if (s.multiple) builder.addStringOption(o => o.setName("set").setDescription("Add or remove value").addChoices([["add", "add"], ["remove", "remove"]]));
							if (s.type === "boolean") builder.addBooleanOption(o => o.setName("value").setDescription("New value"));
							else if (s.type === "channel") builder.addChannelOption(o => o.setName("value").setDescription("New value"));
							else if (s.type === "string") builder.addStringOption(o => o.setName("value").setDescription("New value"));
							else if (s.type === "number") builder.addNumberOption(o => o.setName("value").setDescription("New value"));
							else if (s.type === "role") builder.addRoleOption(o => o.setName("value").setDescription("New value"));
							else if (s.type === "user") builder.addUserOption(o => o.setName("value").setDescription("New value"));
							else throw new Error("Invalid type");
							return builder;
						});
					});
					return x;
				}).addSubcommand(x => x.setName("leaderboard").setDescription("View the leaderboard."))
				.addSubcommand(x => x.setName("viewlevel").setDescription("View a user's level.").addUserOption(o => o.setName("user").setDescription("The user to view the level of.").setRequired(false)));
		}, {
			behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
			idHints: ["1006068723456675910"]
		});
	}

	public async chatInputRun(interaction: discord.CommandInteraction, context: ChatInputCommandContext) {
		try {
			const func: unknown = (this as any)[interaction.options.getSubcommand(true)];
			if (typeof func !== "function") throw new Error("Invalid subcommand");
			await func(interaction, context);
		} catch (error) {
			this.slashHandler(error, interaction, context);
		}
	}

	private async handler(message: discord.Message) {
		if (message.author.bot) return;
		if (this.xpLimit === undefined) return;
		if (!message.guildId) return;
		if (this.ignore.includes(message.guildId)) return;
		const add = utils.getRandomArbitrary(1, 4);
		try {
			await this.xpLimit.consume(`${message.guildId}-${message.author.id}`, add);
		} catch { return; }
		let { xp, nextLevelXp, level } = (await bot.db.member_level.upsert({
			where: {
				memberID_guildID: {
					memberID: message.author.id,
					guildID: message.guildId
				},
			},
			update: {},
			create: {
				memberID: message.author.id,
				guildID: message.guildId,
			}
		}));
		xp = xp + add;
		if (xp > nextLevelXp) {
			level++;
			nextLevelXp = nextLevelXp + Math.round(100 * (1.15 ** level));
			const item = await bot.db.cofnigEntry.upsert({
				where: {
					guildId_module_key: {
						module: "level",
						key: "levelUpMsg",
						guildId: message.guildId
					}
				},
				update: {},
				create: {
					module: "level",
					key: "levelUpMsg",
					guildId: message.guildId,
					value: this.settings.find(s => s.id === "levelUpMsg")?.default ?? ""
				}
			});
			await bot.db.member_level.update({
				where: {
					memberID_guildID: {
						memberID: message.author.id,
						guildID: message.guildId
					},
				},
				data: {
					xp, nextLevelXp, level
				}
			});
			message.channel.send({
				content: utils.formatMessage(item.value as string, {
					user: `<@${message.author.id}>`,
					level: level.toString(),
				}),
				allowedMentions: { users: [message.author.id] }
			});
		} else await bot.db.member_level.update({
			where: {
				memberID_guildID: {
					memberID: message.author.id,
					guildID: message.guildId
				},
			},
			data: {
				xp: xp
			}
		});

	}

	public async leaderboard(interaction: discord.CommandInteraction) {
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

	public async viewlevel(interaction: discord.CommandInteraction) {
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

	async onModuleStart(): Promise<void> {
		this.xpLimit = new RateLimiterMemory({
			points: 30,
			duration: 60
		});
		bot.on("messageCreate", this.handler.bind(this));
	}
	async onModuleDisabledInGuild(id: string): Promise<void> {
		this.ignore.push(id);
	}

	async onModuleEnabledInGuild(id: string): Promise<void> {
		this.ignore = this.ignore.filter(i => i !== id);
	}
}