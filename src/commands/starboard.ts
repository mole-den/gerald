import { GeraldCommand, GeraldModule, GeraldCommandOptions } from "../commandClass";
import { ApplyOptions } from "@sapphire/decorators";
import { CommandInteraction, MessageEmbed, MessageReaction, PartialMessageReaction, ReactionEmoji, TextChannel } from "discord.js";
import { ApplicationCommandRegistry, ChatInputCommandContext, RegisterBehavior } from "@sapphire/framework";
import { bot } from "..";
@ApplyOptions<GeraldCommandOptions>({
	name: "starboard",
	description: "Starboard.",
	requiredUserPermissions: ["ADMINISTRATOR"],
	requiredClientPermissions: [],
	preconditions: ["GuildOnly"],
}) export class Starboard extends GeraldCommand implements GeraldModule {
	public override registerApplicationCommands(reg: ApplicationCommandRegistry) {
		reg.registerChatInputCommand((cmd) => {
			return cmd.setName(this.name)
				.setDescription(this.description)
				.addSubcommand(x =>
					x.setName("setchannel").setDescription("Set the starboard channel.")
						.addChannelOption(o =>
							o.setName("channel").setDescription("Channel.").setRequired(true)))
				.addSubcommand(x => x.setName("disable").setDescription("Disable the starboard."))
				.addSubcommand(x => x.setName("minstars").setDescription("Amount of stars required for a message to go on the starboard.").addIntegerOption(o => o.setName("amount").setDescription("Amount of stars.").setRequired(true)))
				.addSubcommand(x => x.setName("allownsfw").setDescription("Allow NSFW messages to go on the starboard.").addBooleanOption(o => o.setName("allow").setDescription("Allow NSFW messages.").setRequired(true)));
		}, {
			behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
			idHints: ["1011433430942220379"]
		});
	}
	channels: Map<string, string> = new Map();
	settings = null;
	reactions: Set<string> = new Set();
	starred: Map<string, string> = new Map();
	public async setchannel(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const channel = interaction.options.getChannel("channel", true);
		if (channel && channel.type !== "GUILD_TEXT") {
			if (channel.type === "GUILD_NEWS_THREAD" || channel.type === "GUILD_PUBLIC_THREAD" || channel.type === "GUILD_PRIVATE_THREAD")
				return interaction.reply({
					ephemeral: true,
					content: "Cannot be set to a thread."
				});
			return interaction.reply({
				ephemeral: true,
				content: `The channel \`${channel.name}\` is not a valid text channel.`
			});
		}
		const exists = (await bot.db.starboard_data.count({
			where: {
				guildid: interaction.guild.id
			}
		}) !== 0);
		this.channels.set(interaction.guild.id, channel.id);
		if (!exists) interaction.reply({
			content: `Starboard channel set to ${channel} with the following settings:
Allow NSFW messages: false
Minimum amount of stars to go on starboard: 3
Emoji used as "stars": :star::star2:`
		});
		else interaction.reply(`Channel set to ${channel}`);
		if (!exists) await bot.db.starboard_data.create({
			data: {
				guildid: interaction.guild.id,
				allowNsfw: false,
				minstars: 3,
				channel: channel.id,
				emoji: ["⭐", "🌟"]
			}
		});
		else await bot.db.starboard_data.update({
			where: {
				guildid: interaction.guild.id,
			},
			data: {
				channel: channel.id
			}
		});
		if (exists) {
			const r = (await bot.db.starboard_data.findUnique({
				where: {
					guildid: interaction.guild.id
				}
			}))?.emoji;
			if (!r) return;
			r.forEach(u => this.reactions.add(u));
		}
	}
	public disable(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		this.channels.delete(interaction.guild.id);
		bot.db.starboard_data.delete({ 
			where: {
				guildid: interaction.guild.id
			}
		});
		interaction.reply("Starboard disabled. To re-enable, use `/starboard setchannel`.");
	}

	public async minstars(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		if (!this.channels.get(interaction.guild.id)) return interaction.reply({
			content: "Starboard is currently disabled or set to an invalid channel. To enable, use `/starboard setchannel`."
		});
		if (interaction.options.getInteger("amount", true) <= 0) return interaction.reply("Minimum amount of stars must be greater than 0");
		bot.db.starboard_data.update({
			where: {
				guildid: interaction.guild.id
			},
			data: {
				minstars: interaction.options.getInteger("amount", true)
			}
		});
		interaction.reply(`Minimum amount of stars set to ${interaction.options.getInteger("amount", true)}.`);
	}

	public async allownsfw(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		if (!this.channels.get(interaction.guild.id)) return interaction.reply({
			content: "Starboard is currently disabled or set to an invalid channel. To enable, use `/starboard setchannel`."
		});
		bot.db.starboard_data.update({
			where: {
				guildid: interaction.guild.id
			},
			data: {
				allowNsfw: interaction.options.getBoolean("allow", true)
			}
		});
		interaction.reply(interaction.options.getBoolean("allow", true) === false ? "NSFW messages will not appear on the starboard" : "Allowed NSFW messages to show on starboard");
	}

	private async reactionHandler(r: MessageReaction | PartialMessageReaction) {
		const reaction = r.partial ? await r.fetch() : r;
		if (!reaction.message.guild) return;		
		const request = bot.db.starboard_data.findUnique({
			where: {
				guildid: reaction.message.guild.id
			},
		});
		const id = reaction.emoji instanceof ReactionEmoji ? reaction.emoji.name : reaction.emoji.id;
		if (!id) return;
		if (!this.reactions.has(id)) return;
		const v = (await reaction.message.fetch()).reactions.cache.filter(u => {
			const i = u.emoji.name ?? u.emoji.id;
			if (!i) return false;
			return this.reactions.has(i);
		});
		const users: Set<string> = new Set();
		const p = v.map(a => a.users.fetch());
		const x = await Promise.all(p);
		const min = await request;
		if (!min) return;
		x.forEach(u => u.forEach(c => users.add(c.id)));
		if (users.size >= min.minstars) {
			let edit = false;
			const channel = await reaction.message.guild.channels.fetch(min.channel);
			if (!channel) {
				this.channels.delete(reaction.message.guild.id);
				await bot.db.starboard_data.update({
					where: {
						guildid: reaction.message.guild.id
					},
					data: {
						invalid: true
					}
				});
				return;
			}
			if (!channel?.isText()) return;
			if (this.starred.has(reaction.message.id)) edit = true;
			if (channel instanceof TextChannel && channel.nsfw && min.allowNsfw === false) return;
			const embed = new MessageEmbed()
				.setColor("GOLD")
				.setTimestamp(reaction.message.createdTimestamp)
				.setTitle(`${users.size} ⭐`);
			const content = reaction.message.content ? reaction.message.content.length > 1750 ? reaction.message.content.substring(0, 1749) + "..." : reaction.message.content : null;
			content ? embed.setDescription(content) : "";
			const messageAttachment = reaction.message.attachments.size > 0 ? reaction.message.attachments.at(0)?.url : null;
			const embedAttachemnt = reaction.message.embeds[0] ? reaction.message.embeds[0].image?.url ?? null : null;
			if (channel instanceof TextChannel && channel.nsfw === false)
				if (embedAttachemnt) embed.setImage(embedAttachemnt);
				else if (messageAttachment) embed.setImage(messageAttachment);	
			embed.addField("Channel", `${reaction.message.channel}`)
				.addField("Link to message", `[Link](${reaction.message.url})`);
			if (reaction.message.author) embed.setFooter({
				text: reaction.message.author?.username,
				iconURL: reaction.message.author.avatarURL() ?? ""
			});
			if (!edit) {
				const i = await channel.send({
					embeds: [embed]
				});
				this.starred.set(reaction.message.id, i.id);
				await bot.db.starred_msg.create({
					data: {
						guildId: reaction.message.guild.id,
						msgId: reaction.message.id,
						boardId: i.id
					}
				});
			}
			else {
				const i = this.starred.get(reaction.message.id);
				let msg;
				if (!i) return;
				try {
					msg = await channel.messages.fetch(i);
				} catch {
					return;
				}
				msg.edit({
					embeds: [embed]
				});
			}
		}
	}

	public async chatInputRun(interaction: CommandInteraction, context: ChatInputCommandContext) {
		try {
			const group = interaction.options.getSubcommandGroup(false);
			const sub = interaction.options.getSubcommand(false);
			if (!sub) throw new Error("Invalid subcommand");
			const id = group ? `${group}_${sub}` : sub;
			const func: unknown = (this as any)[id];
			if (typeof func !== "function") throw new Error("Invalid subcommand");
			await func.bind(this)(interaction, context);
		} catch (error) {
			this.slashHandler(error, interaction, context);
		}

	}

	async onModuleDisabledInGuild() {
		return true;
	}

	async onModuleEnabledInGuild() {
		return true;
	}

	async onModuleStart() {
		const data = await bot.db.starboard_data.findMany();
		const msg = await bot.db.starred_msg.findMany({});
		data.forEach(i => {
			if (!i.invalid) this.channels.set(i.guildid, i.channel);
			i.emoji.forEach(e => this.reactions.add(e));
		});
		msg.forEach(m => {
			this.starred.set(m.msgId, m.boardId);
		});
		bot.on("messageReactionAdd", this.reactionHandler.bind(this));
	}
}