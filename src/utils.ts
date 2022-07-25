import * as discord from "discord.js";
export namespace utils {
	export const dismissButton = new discord.MessageButton().setLabel("Dismiss").setCustomId("dismissEmbed").setStyle("DANGER");
	export function handleDismissButton(interaction: discord.CommandInteraction, response: discord.Message) {
		const button = response.components;
		button.forEach(i => {
			i.components.forEach(x => {
				if (x.customId === "dismissEmbed") x.disabled = true;
			});
		});
		response.awaitMessageComponent({
			filter: (i) => {
				if (i.user.id !== interaction.user.id) {
					i.reply({
						ephemeral: true,
						content: `Please stop interacting with the components on this message. They are only for ${interaction.user.toString()}.`,
						allowedMentions: { users: [], roles: [] }
					});
					return false;
				}
				return true;
			}, componentType: "BUTTON", time: 15000
		})
			.then(() => interaction.deleteReply())
			.catch(() => {
				interaction.editReply({
					components: [...button]
				});
			});

	}
	export async function awaitButtonResponse(interaction: discord.CommandInteraction, response: discord.Message, type?: string, timeout = 15000) {
		let x: discord.ButtonInteraction<discord.CacheType>;
		try {
			x = await response.awaitMessageComponent({
				filter: (i) => {
					if (i.user.id !== interaction.user.id) {
						i.reply({
							ephemeral: true,
							content: `Please stop interacting with the components on this message. They are only for ${interaction.user.toString()}.`,
							allowedMentions: { users: [], roles: [] }
						});
						return false;
					}
					if (type && i.customId !== type) return false;
					return true;
				}, componentType: "BUTTON", time: timeout
			});
		} catch {
			return null;
		}
		return x;
	}
	export interface buttonListenerInput<T> {
		interaction: discord.CommandInteraction;
		response: discord.Message;
		type?: string;
		timeout?: number;
		onClick: (button: discord.ButtonInteraction, next: (value: T) => void) => Promise<void>;
		onEnd: () => void
	}
	export function buttonListener<T>(input: buttonListenerInput<T>): Promise<T | undefined> {
		return new Promise((resolve) => {
			let resolved = false;
			const collector = input.response.createMessageComponentCollector({ componentType: "BUTTON", time: input.timeout ?? 15000 });

			collector.on("collect", async i => {
				if (i.user.id === input.interaction.user.id) {
					if (i.customId === "dismissEmbed") return await input.interaction.deleteReply();
					if (input.type)
						if (input.type === i.customId) return await input.onClick(i, next);
						else return;
					return await input.onClick(i, next);
				} else return await i.reply({
					ephemeral: true,
					content: `Please stop interacting with the components on this message. They are only for ${input.interaction.user.toString()}.`,
					allowedMentions: { users: [], roles: [] }
				});
			});

			collector.on("end", async () => {
				if (resolved === false) {
					input.onEnd();
					resolve(undefined);
				}
			});
			function next(value: T) {
				resolved = true;
				collector.stop();
				resolve(value);
			}
		});

	}
	export async function disableButtons(response: discord.Message) {
		const button = response.components;
		button.forEach(i => {
			i.components.forEach(x => {
				x.disabled = true;
			});
		});
		try {
			await response.edit({
				components: [...button]
			});
		} catch {
			return;
		}
	}
	export interface selectMenuInput<T> {
		user: string
		response: discord.Message;
		timeout?: number;
		onClick: (menu: discord.SelectMenuInteraction, next: (value: T) => void) => Promise<void>;
		onEnd: () => void;
		other: (next: (value: T) => void) => Promise<void>;
	}
	export function selectMenuListener<T>(input: selectMenuInput<T>): Promise<T | undefined> {
		return new Promise((resolve) => {
			let resolved = false;
			const collector = input.response.createMessageComponentCollector({ componentType: "SELECT_MENU", time: input.timeout ?? 15000 });
			const col2 = input.response.createMessageComponentCollector({ componentType: "BUTTON", time: input.timeout ?? 15000 });
			col2.on("collect", async (i) => {
				if (i.user.id === input.user && i.customId === "dismissEmbed") input.response.delete();
			});
			collector.on("collect", async i => {
				if (i.user.id === input.user) return await input.onClick(i, next);
				else return await i.reply({
					ephemeral: true,
					content: `Please stop interacting with the components on this message. They are only for <@${input.user}>.`,
					allowedMentions: { users: [], roles: [] }
				});
			});

			collector.on("end", async () => {
				if (resolved === false) {
					input.onEnd();
					resolve(undefined);
				}
			});
			function next(value: T) {
				resolved = true;
				collector.stop();
				resolve(value);
			}
			input.other(next);
		});

	}
	export interface awaitMessageInput<T> {
		user: string
		response: discord.Message;
		timeout?: number;
		onClick: (message: discord.Message, next: (value: T) => void) => Promise<void>;
		onEnd: () => void;
		other: (next: (value: T) => void) => Promise<void>
	}
	export function awaitMessageResponse<T>(input: awaitMessageInput<T>): Promise<T | undefined> {
		return new Promise((resolve) => {
			let resolved = false;
			const collector = input.response.channel.createMessageCollector({ time: input.timeout ?? 15000 });

			collector.on("collect", async i => {
				if (i.author.id === input.user) return await input.onClick(i, next);
			});

			collector.on("end", async () => {
				if (resolved === false) {
					input.onEnd();
					resolve(undefined);
				}
			});
			function next(value: T) {
				resolved = true;
				collector.stop();
				resolve(value);
			}
			input.other(next);
		});

	}

	export function formatMessage(string: string, items: { [key: string]: string }) {
		Object.keys(items).forEach(k => {
			string = string.replace(`{{${k}}}`, items[k]);
		});
		return string;
	}

	export function getRandomArbitrary(min: number, max: number) {
		return Math.round(Math.random() * (max - min) + min);
	}

	export function durationToMS(duration: string): number {
		const timeRegex = /([0-9]+(m($| )|min($| )|mins($| )|minute($| )|minutes($| )|h($| )|hr($| )|hrs($| )|hour($| )|hours($| )|d($| )|day($| )|days($| )|wk($| )|wks($| )|week($| )|weeks($| )|mth($| )|mths($| )|month($| )|months($| )|y($| )|yr($| )|yrs($| )|year($| )|years($| )))+/gmi;
		let durationMS = 0;
		if (duration.length > 30) return NaN;
		const durationArr = duration.match(timeRegex);
		if (!durationArr) return NaN;
		durationArr.forEach((d) => {
			const time = d.match(/[0-9]+/gmi);
			const unit = d.match(/[a-zA-Z]+/gmi);
			if (!time || !unit) return;
			const timeNum = parseInt(time[0]);
			let unitNum = 0;
			switch (unit[0].toLowerCase()) {
			case "m":
			case "min":
			case "mins":
			case "minute":
			case "minutes":
				unitNum = 60000;
				break;
			case "h":
			case "hr":
			case "hrs":
			case "hour":
			case "hours":
				unitNum = 3600000;
				break;
			case "d":
			case "day":
			case "days":
				unitNum = 86400000;
				break;
			case "wk":
			case "wks":
			case "week":
			case "weeks":
				unitNum = 604800000;
				break;
			case "mth":
			case "mths":
			case "month":
			case "months":
				unitNum = 2592000000;
				break;
			case "y":
			case "yr":
			case "yrs":
			case "year":
			case "years":
				unitNum = 31536000000;
				break;
			}
			durationMS += timeNum * unitNum;
		});
		return durationMS;
	}
	export function sleep(ms: number): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}
	
	export function cleanMentions(str: string): string {
		return str.replace(/@everyone/g, "@\u200beveryone").replace(/@here/g, "@\u200bhere");
	}
	
}