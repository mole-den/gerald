import * as discord from "discord.js";
import * as sapphire from "@sapphire/framework";
import { scheduledTaskManager } from "./taskManager";
import { PrismaClient } from "@prisma/client";
import { utils } from "./utils";
import Time from "@sapphire/time-utilities";
import { GeraldCommand, GeraldModule } from "./commandClass";
process.on("SIGTERM", async () => {
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
			},
			logger: {
				level: sapphire.LogLevel.Info,
				instance: new sapphire.Logger(sapphire.LogLevel.Info)
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
		await super.login(process.env.TOKEN);
		taskScheduler = new scheduledTaskManager();
		await utils.sleep(4000);
		this.user?.setStatus("dnd");
		bot.stores.get("commands").forEach(i => {
			const m = (<GeraldCommand | GeraldCommand & GeraldModule>i);
			if (m.isModule(m)) m.onModuleStart();
		});
		console.log("Ready");
		
	}
	public override destroy(): void {
		bot.db.$disconnect();
		super.destroy();
	}

}
export const bot = new Gerald();
export let taskScheduler: scheduledTaskManager;


bot.on("chatInputCommandDenied", (error: sapphire.UserError, payload: sapphire.ChatInputCommandDeniedPayload) => {
	payload.interaction.reply({ content: error.message, allowedMentions: { users: [payload.interaction.user.id], roles: [] }, ephemeral: true });
});

bot.on("guildCreate", async (guild) => {
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
				c.messages.fetch({ limit: 10 });
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