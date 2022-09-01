import { member_economy, PrismaClient } from "@prisma/client";
import { ApplyOptions } from "@sapphire/decorators";
import { ApplicationCommandRegistry, ChatInputCommandContext, RegisterBehavior } from "@sapphire/framework";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { bot } from "..";
import { GeraldCommand, GeraldCommandOptions } from "../commandClass";
class UserEconomy {
	readonly guildId: string;
	readonly memberId: string;
	private _job: string | null = null;
	public get balance(): number {
		return this._balance;
	}
	private _balance = 0;
	private _loaded = false;
	private _failed = false;
	private _client: PrismaClient;
	constructor(guildId: string, userId: string, client: PrismaClient) {
		this.guildId = guildId;
		this.memberId = userId;
		this._client = client;
	}
	public async fetch() {
		let data: member_economy;
		try {
			data = (await this._client.member_economy.upsert({
				where: {
					guildId_memberId: {
						guildId: this.guildId,
						memberId: this.memberId
					}
				},
				update: {},
				create: {
					guildId: this.guildId,
					memberId: this.memberId,
					job: null,
					balance: 0,
	
				}
			}))!;	
		} catch {
			this._failed = true;
			this._balance = 0;
			this._loaded = true;
			return this;
		}
		this._balance = data.balance;
		this._job = data.job;
		this._loaded = true;
		return this;
	}

	public updateBalance(amount: number) {
		if (!this._failed) throw new Error("Guild economy has not been set up");
		if (amount > this._balance) return false;
		this._balance = amount;
		return new Promise<void>((resolve) => {
			this._client.member_economy.update({
				where: {
					guildId_memberId: {
						guildId: this.guildId,
						memberId: this.memberId
					}
				},
				data: {
					balance: amount
				}
			}).then(() => resolve());
		});
	}

	public async fetchGuildData(jobs = false, users = false) {
		const data = (await this._client.guild_economy.findUnique({
			where: {
				guildId: this.guildId
			},
			include: {
				economy_jobs: jobs,
				users: users,
			}
		}));
		if (!data) throw new Error("Guild economy has not been set up");
		return data;
	}

	public async updateJob(newJob: string) {
		throw new Error(newJob);
	}
}

@ApplyOptions<GeraldCommandOptions>({
	name: "economy",
	description: "economy",
	requiredUserPermissions: [],
	requiredClientPermissions: [],
	preconditions: ["GuildOnly"],
})
export class Economy extends GeraldCommand {
	public override registerApplicationCommands(reg: ApplicationCommandRegistry) {
		reg.registerChatInputCommand((cmd) => {
			return cmd.setName(this.name)
				.setDescription(this.description)
				.addSubcommand(s =>
					s.setName("work").setDescription("Earn money.").addStringOption(o =>
						o.setName("job").setDescription("The job to earn money from.").setRequired(true)
					)
				).addSubcommand(s =>
					s.setName("stats").setDescription("Stats about the economy.")
				).addSubcommand(s =>
					s.setName("leaderboard").setDescription("View leaderboard for the economy.")
				).addSubcommand(s =>
					s.setName("balance").setDescription("View a user's balance.").addUserOption(o =>
						o.setName("user").setDescription("Whose balance to view.").setRequired(false)
					)
				).addSubcommand(s =>
					s.setName("gift").setDescription("Give another user money.").addUserOption(o =>
						o.setName("user").setDescription("The user to give money to.").setRequired(true)
					).addStringOption(o =>
						o.setName("amount").setDescription("The amount of money to give (or 'all')").setRequired(true)
					)
				).addSubcommand(s =>
					s.setName("store").setDescription("View the store and buy items.")
				).addSubcommand(s =>
					s.setName("editstore").setDescription("Edit items in the store.").addStringOption(o =>
						o.setName("action").setDescription("The action to perform").addChoice("add", "add").addChoice("remove", "remove").addChoice("edit", "edit").setRequired(true)
					).addStringOption(o =>
						o.setName("item").setDescription("The name of the item to add/remove/edit")
					)
				).addSubcommand(s =>
					s.setName("settings").setDescription("Server economy settings.")
				).addSubcommand(s =>
					s.setName("channelsettings").setDescription("Channel specific settings.")
				);
		}, {
			behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
			idHints: ["1011846150770393118"]
		});
	}

	public async balance(interaction: CommandInteraction) {
		const user = new UserEconomy(interaction.guild!.id, interaction.options.getUser("user")?.id ?? interaction.user.id, bot.db);
		await user.fetch();
		interaction.editReply({
			content: user.balance.toString()
		});
	}

	public async leaderboard(interaction: CommandInteraction) {
		const embed = new MessageEmbed();
		embed.setTitle(`${interaction.guild!.name} economy leaderboard`)
			.setColor("GREEN").setTimestamp();
		const data = (await (await new UserEconomy(interaction.guild!.id, interaction.user.id, bot.db).fetch()).fetchGuildData(false, true));
		const sorted = data.users.sort((a, b) => a.balance - b.balance).slice(0, 9);
		let content = "";
		let pos = 1;
		for (const i of sorted) {
			let p;
			switch (pos) {
			case 1:
				p = "1st";
				break;
			case 2:
				p = "2nd";
				break;
			case 3:
				p = "3rd";
				break;
			default:
				p = `${pos}th`;
				break;
			}
			content = content + `**${p}**. <@${i.memberId}>: ${data.currency}${i.balance}\n`;
			pos++;
		}
		embed.setDescription(content);
		interaction.reply({
			embeds: [embed]
		});
	}
	override async chatInputRun(interaction: CommandInteraction, context: ChatInputCommandContext) {
		try {
			interaction.deferReply();
			super.chatInputRun(interaction, context);
		} catch {
			interaction.reply("Not implemented yet");
		}

	}

}