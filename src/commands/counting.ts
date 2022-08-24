import { GeraldCommand, GeraldModule, GeraldCommandOptions } from "../commandClass";
import { ApplyOptions } from "@sapphire/decorators";
import { CommandInteraction, GuildMember, Message } from "discord.js";
import { ApplicationCommandRegistry, ChatInputCommandContext, RegisterBehavior } from "@sapphire/framework";
import { bot } from "..";
import _ from "lodash";
@ApplyOptions<GeraldCommandOptions>({
	name: "counting",
	description: "Counting.",
	requiredUserPermissions: ["MANAGE_CHANNELS"],
	requiredClientPermissions: [],
	preconditions: ["GuildOnly"],
}) export class Counting extends GeraldCommand implements GeraldModule {
	public override registerApplicationCommands(reg: ApplicationCommandRegistry) {
		reg.registerChatInputCommand((cmd) => {
			return cmd.setName(this.name)
				.setDescription(this.description)
				.addSubcommand(x =>
					x.setName("setchannel").setDescription("Set the channel to count in.")
						.addChannelOption(o =>
							o.setName("channel").setDescription("Channel to count in.").setRequired(true)))
						
				.addSubcommand(x => x.setName("disable").setDescription("Disable counting."))
				.addSubcommand(x => x.setName("failrole").setDescription("Set the role given when someone counts incorrectly.")
					.addRoleOption(o => o.setName("role").setDescription("Role to give.").setRequired(true)));
		}, {
			behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
			idHints: ["1007863726298365972"]
		});
	}
	channels: string[] = [];
	settings = null;
	public async failrole(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const role = interaction.options.getRole("role", true);
		if (!role) return;
		await bot.db.counting_data.update({
			where: {
				guildid: interaction.guild.id
			},
			data: {
				failrole: role.id,
			}
		});
		interaction.reply({
			content: `Role ${role} will be given when someone counts incorrectly.`,
			ephemeral: true,
		});
	}
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
		bot.db.counting_data.upsert({
			where: {
				guildid: interaction.guild.id,
			},
			update: {
				channel: channel.id
			},
			create: {
				guildid: interaction.guild.id,
				channel: channel.id,
				user: "",
				number: 0,
				failrole: ""
			}
		});
		this.channels.push(channel.id);
		interaction.reply({
			content: `Counting channel set to ${channel} (Next number is 1)`
		});
	}
	public async disable(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const channel = await bot.db.counting_data.findUniqueOrThrow({
			where: {
				guildid: interaction.guild.id,
			}
		});
		this.channels = this.channels.filter(i => i !== channel.channel);
		bot.db.counting_data.delete({
			where: {
				guildid: interaction.guild.id
			}
		});
		interaction.reply({
			ephemeral: true,
			content: "Counting disabled. To enable again, use `/counting setchannel`"
		});
	}
	private async handler(message: Message) {
		if (!message.guild) return;
		if (!this.channels.includes(message.channel.id)) return;
		if (message.author.bot) return;
		const number = _.parseInt(message.content);
		if (isNaN(number)) return;
		const data = await bot.db.counting_data.upsert({
			where: {
				guildid: message.guild.id,
			},
			update: {},
			create: {
				guildid: message.guild.id,
				number: 0,
				user: "",
				channel: message.channel.id,
				failrole: "",
			},
		});
		if (data.user === message.author.id) {
			const failrole = await bot.db.counting_data.findUnique({
				where: {
					guildid: message.guild.id,
				},
				select: {
					failrole: true,
				}
			});
			await bot.db.counting_data.update({
				where: {
					guildid: message.guild.id
				},
				data: {
					user: "",
					number: 0,
				}
			});
			if (failrole && failrole.failrole !== "") (message.member as GuildMember).roles.add(failrole.failrole);
			message.react("❗");
			message.channel.send(`${message.author} You can't count two numbers in a row. The next number was ${data.number + 1}.`);
			return;
		}
		if (number !== data.number + 1) {
			const failrole = await bot.db.counting_data.findUnique({
				where: {
					guildid: message.guild.id,
				},
				select: {
					failrole: true,
				}
			});
			await bot.db.counting_data.update({
				where: {
					guildid: message.guild.id
				},
				data: {
					user: "",
					number: 0,
				}
			});
			if (failrole && failrole.failrole !== "") (message.member as GuildMember).roles.add(failrole.failrole);
			message.react("❗");
			message.channel.send(`${message.author} Incorrect number. The next number was ${data.number + 1}.`);
			return;
		} else {
			await bot.db.counting_data.update({
				where: {
					guildid: message.guild.id,
				},
				data: {
					user: message.author.id,
					number: data.number + 1,
				}
			});
			message.react("✅");
		}

	}

	public async onModuleDisabledInGuild() {
		return true;
	}

	public async onModuleEnabledInGuild() {
		return;
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

	public async onModuleStart() {
		const channels = await bot.db.counting_data.findMany({});
		this.channels = channels.filter(i => i.channel !== "").map(i => i.channel);
		bot.on("messageCreate", this.handler.bind(this));
	}
}