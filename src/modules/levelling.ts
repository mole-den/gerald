import { prisma, bot, getRandomArbitrary, } from "..";
import { RateLimiterMemory } from "rate-limiter-flexible"
import { Module, settings } from "../commandClass";
import { utils } from "../utils";
import * as discord from "discord.js";
export class Levelling extends Module {
    xpLimit: RateLimiterMemory | undefined
    declare settings: settings.Setting[]
    constructor() {
        super({
            name: "levelling",
            description: "Levelling",
            settings: [{
                id: "levelUpMsg",
                name: "Message sent on level up",
                type: "string",
                description: "Message sent when a user levels up. Use `{{user}}` to mention the user and `{{level}}` to get the user's new level.",
                default: "{{user}} is now level {{level}}."
            }]
        })
    }

    async handler(message: discord.Message) {
        if (message.author.bot) return
        console.log("a")
        if (!message.guild) return
        let x = await prisma.member_level.findUnique({
            where: {
                memberID_guildID: {
                    memberID: message.author.id,
                    guildID: message.guildId!
                }
            }
        })
        if (!x) x = await prisma.member_level.create({
            data: {
                memberID: message.author.id,
                guildID: message.guildId!,
            }
        })
        let add = getRandomArbitrary(1, 4)
        try {
            this.xpLimit!.consume(`${message.guildId}-${message.author.id}`, add)
        } catch (error) {
            return
        }
        x.xp = x.xp + add
        if (x.xp >= x.nextLevelXp) {
            x.level++
            x.nextLevelXp = Math.round(100 * ((1 + 0.15) ** x.level))
            let item = (await settings.getSetting(this.name, message.member!.guild.id, this.settings))!.find(i => i.id === "levelUpMsg")
            await message.channel.send({
                content: utils.formatMessage(item!.value as string, {
                    user: `<@${message.author.id}>`,
                    level: x.level.toString(),
                }),
                allowedMentions: { parse: ["users"], users: [message.author.id] }
            })
        }
        await prisma.member_level.update({
            where: {
                memberID_guildID: {
                    memberID: message.author!.id,
                    guildID: message.guildId!
                },
            },
            data: {
                level: x.level,
                nextLevelXp: x.nextLevelXp,
                xp: x.xp
            }
        })
    }
    async load(): Promise<void> {
        this.xpLimit = new RateLimiterMemory({
            points: 30,
            duration: 60
        })
        bot.on("messageCreate", x => this.handler(x))

    }
    async unload(): Promise<void> {
        bot.off("messageCreate", x => this.handler(x))
    }
}
