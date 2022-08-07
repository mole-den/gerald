import * as discord from "discord.js";
import * as sapphire from "@sapphire/framework";
import { scheduledTaskManager } from "./taskManager";
import { PrismaClient } from "@prisma/client";
import { utils } from "./utils";
import Time from "@sapphire/time-utilities";
import { GeraldCommand } from "./commandClass";
process.on("SIGTERM", async () => {
	console.log("SIGTERM received");
	void bot.destroy();
	process.exit(0);
});
class Gerald extends sapphire.SapphireClient {
	db: PrismaClient;
	constructor() {
		super({
			typing: true,
			intents: new discord.Intents([discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MEMBERS, discord.Intents.FLAGS.GUILD_MESSAGES,
				discord.Intents.FLAGS.DIRECT_MESSAGES, discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
				discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, discord.Intents.FLAGS.GUILD_VOICE_STATES]),
			partials: ["CHANNEL"],
			defaultCooldown: {
				scope: 3,
				limit: 2,
				delay: Time.Time.Second * 3
			}
		});
		this.db = new PrismaClient({
			log: ["info", "warn", "error"],
		});
	}
	
	public async start(): Promise<void> {
		console.log("Starting...");
		await this.db.$connect();
		console.log("Connected to database");
		await utils.sleep(1000);
		if (!process.env.TOKEN) throw new Error("No token found");
		await super.login("NjcxMTU2MTMwNDgzMDExNjA1.Xi402g.5bkHBmP-S4WtI2DMtr2qAt8QVRQ");
		taskScheduler = new scheduledTaskManager();
		const x = await this.db.guild.count();
		const guilds = await this.guilds.fetch();
		if (guilds.size > x) {
			console.log("Guilds:", guilds.size, "Database:", x);
			guilds.each(async (guild) => {
				await this.db.guild.create({
					data: {
						guildId: guild.id,
						joinedTime: new Date()
					}
				});
			});
		}
		await utils.sleep(4000);
		this.user?.setStatus("dnd");
		bot.stores.get("commands").forEach(i => {
			(<GeraldCommand>i).onCommandStart();
		});
		console.log("Ready");
	}
	public override destroy(): void {
		bot.db.$disconnect();
		taskScheduler.removeAllListeners();
		super.destroy();
	}

}
export const bot = new Gerald();
export let taskScheduler: scheduledTaskManager;


bot.on("messageCommandDenied", ({ context, message: content }: sapphire.UserError, { message }: sapphire.MessageCommandDeniedPayload) => {
	// `context: { silent: true }` should make UserError silent:
	// Use cases for this are for example permissions error when running a hidden command.
	if (Reflect.get(Object(context), "silent")) return;
	message.channel.send({ content, allowedMentions: { users: [message.author.id], roles: [] } });
});

bot.on("guildCreate", async (guild) => {
	const botUser = bot.user?.id;
	if (!botUser) return;
	const user = await guild.members.fetch(botUser);
	if (user.permissions.has(discord.Permissions.FLAGS.ADMINISTRATOR) === false) guild.leave();
	bot.db.guild.create({
		data: {
			guildId: guild.id,
			joinedTime: new Date(),
		},
	});
	guild.channels.fetch().then(async (channels) => {
		channels.each(async (ch) => {
			if (ch.type === "GUILD_TEXT") {
				const c = (await ch.fetch() as discord.TextChannel);
				c.messages.fetch({ limit: 100 });
			}
		});
	});
});
async function deletedMessageHandler(message: discord.Message | discord.PartialMessage, delTime: Date) {
	if (message.partial || message.author.bot || message.guild === null) return;
	await utils.sleep(100);
	
	const logs = await message.guild.fetchAuditLogs({
		type: 72
	});
	const auditEntry = logs.entries.find(a =>
		a.target.id === message.author.id
		&& a.extra.channel.id === message.channel.id
		&& Date.now() - a.createdTimestamp < 5000
	);
	const entry = auditEntry;
	const executor = (entry && entry.executor) ? entry.executor.tag : "Unknown (Most likely the author or a bot)";
	const attachments: {
		url: string,
		name: string | null
	}[] | null = [];
	message.attachments.each((attachment) => {
		attachments.push({
			url: attachment.url,
			name: attachment.name
		});
	});
	await bot.db.member.createMany({
		data: [{
			userid: message.id,
			guildid: message.guild.id
		}],
		skipDuplicates: true
	});
	await bot.db.deleted_msg.create({
		data: {
			author: message.author.id,
			content: message.content,
			guildId: message.guild.id,
			msgTime: new Date(message.createdAt.getTime()),
			channel: message.channel.id,
			deletedTime: delTime,
			deletedBy: executor,
			msgId: message.id,
			attachments: attachments,
		}

	});
}

bot.on("messageDelete", async (message) => await deletedMessageHandler(message, new Date()));
bot.on("messageDeleteBulk", async (array) => {
	const delTime = new Date();
	await utils.sleep(100);
	array.each(async (message) => {
		await deletedMessageHandler(message, delTime);
	});
});

bot.start();
//zac very cringe
//gustavo cringe
//gerald cringe