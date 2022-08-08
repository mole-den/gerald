import * as discord from "discord.js";
import { ApplicationCommandRegistry, ChatInputCommandContext, RegisterBehavior } from "@sapphire/framework";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { bot } from "../index";
import { GeraldCommand, geraldCommandOptions, GeraldModule } from "../commandClass";
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
	settings = [{
		id: "levelUpMsg",
		name: "Message sent on level up",
		description: "Message sent when a user levels up. Use `{{user}}` to mention the user and `{{level}}` to get the user's new level.",
		default: "{{user}} is now level {{level}}."
	}, {
		id: "earnVcXp",
		name: "Earn xp from activty in voice channels.",
		default: "true",
		description: "Earn xp from talking in voice channels and streaming."
	}];
	public override registerApplicationCommands(reg: ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name)
				.setDescription(this.description).addSubcommand(x => x.setName("settings").setDescription("View settings for levelling."))
				.addSubcommand(x => x.setName("leaderboard").setDescription("View the leaderboard."))
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
		const x = (await bot.db.member_level.upsert({
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
		const add = utils.getRandomArbitrary(1, 4);
		try {
			this.xpLimit.consume(`${message.guildId}-${message.author.id}`, add);
		} catch (error) {
			return;
		}
		x.xp = x.xp + add;
		if (x.xp >= x.nextLevelXp) {
			x.level++;
			x.nextLevelXp = x.nextLevelXp + Math.round(100 * (1.15 ** x.level));
			const item = await bot.db.cofnigEntry.findFirstOrThrow({
				where: {
					module: "level",
					key: "levelUpMsg"
				}
			});
			message.channel.send({
				content: utils.formatMessage(item.value as string, {
					user: `<@${message.author.id}>`,
					level: x.level.toString(),
				}),
				allowedMentions: { users: [message.author.id] }
			});
		}
		bot.db.member_level.update({
			where: {
				memberID_guildID: {
					memberID: message.author.id,
					guildID: message.guildId
				},
			},
			data: {
				level: x.level,
				nextLevelXp: x.nextLevelXp,
				xp: x.xp
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
	async onModuleDisabled(): Promise<void> {
		bot.off("messageCreate", this.handler.bind(this));
		this.xpLimit = undefined;
	}
}