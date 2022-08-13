import { GeraldCommand, GeraldModule, GeraldCommandOptions, GeraldModuleSetting } from "../commandClass";
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
				.addSubcommand(x => x.setName("disable").setDescription("Disable counting."));
		}, {
			behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
			idHints: []
		});
	}
	settings: GeraldModuleSetting[] = [{
		id: "failrole",
		name: "failrole",
		description: "Role given when someone counts incorrectly.",
		type: "role",
		default: "",
		multiple: false
	}];
	channels: string[] = [];

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
		bot.db.cofnigEntry.update({
			where: {
				guildId_module_key: {
					guildId: interaction.guild.id,
					module: "counting",
					key: "channel"
				}
			},
			data: {
				value: channel.id
			}
		});
		this.channels.push(channel.id);
		interaction.reply({
			content: `Counting channel set to ${channel} (Next number is 1)`
		});
	}
	public async disable(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const channel = await bot.db.cofnigEntry.findUniqueOrThrow({
			where: {
				guildId_module_key: {
					guildId: interaction.guild.id,
					module: "counting",
					key: "channel"
				}
			}
		});
		bot.db.cofnigEntry.update({
			where: {
				guildId_module_key: {
					guildId: interaction.guild.id,
					module: "counting",
					key: "currentnumber"
				}
			},
			data: {
				value: "0"
			}
		});
		this.channels = this.channels.filter(i => i !== channel.value);
		bot.db.cofnigEntry.update({
			where: {
				guildId_module_key: {
					guildId: interaction.guild.id,
					module: "counting",
					key: "channel"
				}
			},
			data: {
				value: ""
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
		console.log(number);
		if (isNaN(number)) return;
		const current = _.parseInt((await bot.db.cofnigEntry.findUniqueOrThrow({
			where: {
				guildId_module_key: {
					guildId: message.guild.id,
					module: "counting",
					key: "currentnumber"
				}
			},
			select: {
				value: true
			}
		})).value);
		if (number !== current + 1) {
			const failrole = await bot.db.cofnigEntry.findUniqueOrThrow({
				where: {
					guildId_module_key: {
						guildId: message.guild.id,
						module: "counting",
						key: "failrole"
					}
				},
				select: {
					value: true
				}
			});
			if (failrole.value !== "") (message.member as GuildMember).roles.add(failrole.value);
			message.react("❗");
			message.channel.send(`${message.author} Incorrect number. The next number was ${current + 1}`);
			return;
		} else {
			await bot.db.cofnigEntry.update({
				where: {
					guildId_module_key: {
						guildId: message.guild.id,
						module: "counting",
						key: "currentnumber"
					}
				},
				data: {
					value: (current + 1).toString()
				}
			});
			message.react("✅");
		}

	}

	public async onModuleDisabledInGuild() {
		return true;
	}

	public async onModuleEnabledInGuild(g: string) {
		bot.db.cofnigEntry.create({
			data: {
				module: "counting",
				key: "channel",
				value: "",
				guildId: g
			}
		});
		bot.db.cofnigEntry.create({
			data: {
				module: "counting",
				key: "currentnumber",
				value: "0",
				guildId: g
			}
		});
	}

	public async chatInputRun(interaction: CommandInteraction, context: ChatInputCommandContext) {
		try {
			const func: unknown = (this as any)[interaction.options.getSubcommand(true)];
			if (typeof func !== "function") throw new Error("Invalid subcommand");
			await func(interaction, context);
		} catch (error) {
			this.slashHandler(error, interaction, context);
		}

	}

	public async onModuleStart() {
		const channels = await bot.db.cofnigEntry.findMany({
			where: {
				module: "counting",
				key: "channel",
			}
		});
		this.channels = channels.filter(i => i.value !== "").map(i => i.value);
		bot.on("messageCreate", this.handler.bind(this));
	}
}