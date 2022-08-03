import * as discord from "discord.js";
import { ApplicationCommandRegistry, RegisterBehavior } from "@sapphire/framework";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { bot } from "../index";
import { GeraldCommand, geraldCommandOptions } from "../commandClass";
import { ApplyOptions } from "@sapphire/decorators";
import { utils } from "../utils";
///<reference types="../index"/>
@ApplyOptions<geraldCommandOptions>({
	name: "level",
	description: "A basic server xp and levelling system.",
	requiredClientPermissions: [],
	requiredUserPermissions: "MANAGE_MESSAGES",
	preconditions: ["GuildOnly"],
	options: ["id"],
	settings: [{
		id: "levelUpMsg",
		name: "Message sent on level up",
		description: "Message sent when a user levels up. Use `{{user}}` to mention the user and `{{level}}` to get the user's new level.",
		default: "{{user}} is now level {{level}}."
	}, {
		id: "earnVcXp",
		name: "Earn xp from activty in voice channels.",
		default: "true",
		description: "Earn xp from talking in voice channels and streaming."
	}],
	subcommands: [{
		name: "Settings",
		handlerName: "settings"
	}]
}) export class Levelling extends GeraldCommand {
	xpLimit: RateLimiterMemory | undefined;
	public override registerApplicationCommands(reg: ApplicationCommandRegistry) {
		reg.registerChatInputCommand((builder) => {
			return builder.setName(this.name)
				.setDescription(this.description).addSubcommand(x => x.setName("Settings").setDescription("View settings for levelling."));
		}, {
			behaviorWhenNotIdentical: RegisterBehavior.Overwrite
		});
	}

	public async slashRun() {
		return;
	}
	async handler(message: discord.Message) {
		if (message.author.bot) return;
		if (this.xpLimit === undefined) return;
		if (!message.guildId) return;
		let x = ((await bot.db.member_level.findMany({
			where: {
				memberID: message.author.id,
				guildID: message.guildId
			}
		}))[0]);
		if (!x) x = await bot.db.member_level.create({
			data: {
				memberID: message.author.id,
				guildID: message.guildId,
			}
		});
		const add = utils.getRandomArbitrary(1, 4);
		try {
			this.xpLimit.consume(`${message.guildId}-${message.author.id}`, add);
		} catch (error) {
			return;
		}
		x.xp = x.xp + add;
		if (x.xp >= x.nextLevelXp) {
			x.level++;
			x.nextLevelXp = x.nextLevelXp + Math.round(100 * ((1 + 0.15) ** x.level));
			const item = await bot.db.cofnigEntry.findFirstOrThrow({
				where: {
					module: "level",
					key: "levelUpMsg"
				}
			});
			await message.channel.send({
				content: utils.formatMessage(item.value as string, {
					user: `<@${message.author.id}>`,
					level: x.level.toString(),
				}),
				allowedMentions: { users: [message.author.id] }
			});
		}
		await bot.db.member_level.update({
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
	async onCommandStart(): Promise<void> {
		this.xpLimit = new RateLimiterMemory({
			points: 30,
			duration: 60
		});
		bot.on("messageCreate", this.handler);
	}
	async onCommandDisabled(): Promise<void> {
		bot.off("messageCreate", this.handler);
		this.xpLimit = undefined;
	}
}